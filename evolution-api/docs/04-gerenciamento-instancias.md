# Gerenciamento de Instâncias

Uma **instância** no Evolution API representa uma conexão individual com uma conta WhatsApp. Esta seção documenta todas as operações de gerenciamento de instâncias.

## Endpoints

### 1. Criar Instância

**Endpoint:** `POST /instance/create`

Cria uma nova instância para conexão WhatsApp.

```json
{
  "instanceName": "minha-instancia",
  "integration": "WHATSAPP-BAILEYS",
  "token": "token-opcional-customizado",
  "qrcode": true,
  "number": "5511999999999",
  "webhook": {
    "enabled": true,
    "url": "https://meusite.com/webhook",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  },
  "websocket": {
    "enabled": true,
    "events": ["MESSAGES_UPSERT"]
  },
  "rabbitmq": {
    "enabled": false
  },
  "chatwoot": {
    "enabled": false
  },
  "typebot": {
    "enabled": false
  }
}
```

#### Parâmetros de Criação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `instanceName` | string | Sim | Nome único da instância |
| `integration` | string | Não | Tipo: `WHATSAPP-BAILEYS` ou `WHATSAPP-BUSINESS` |
| `token` | string | Não | Token customizado (gerado automaticamente se não fornecido) |
| `qrcode` | boolean | Não | Retornar QR code na resposta |
| `number` | string | Não | Número associado (para Business API) |
| `webhook` | object | Não | Configuração de webhook |
| `websocket` | object | Não | Configuração de websocket |
| `rabbitmq` | object | Não | Configuração de RabbitMQ |
| `chatwoot` | object | Não | Integração Chatwoot |
| `typebot` | object | Não | Integração Typebot |

#### Resposta

```json
{
  "instance": {
    "instanceName": "minha-instancia",
    "instanceId": "uuid-da-instancia",
    "status": "created"
  },
  "hash": {
    "apikey": "api-key-gerada"
  },
  "qrcode": {
    "code": "QR_CODE_STRING",
    "base64": "data:image/png;base64,..."
  }
}
```

---

### 2. Conectar ao WhatsApp

**Endpoint:** `GET /{instance}/instance/connect`

Inicia a conexão com o WhatsApp e retorna o QR Code para autenticação.

#### Resposta

```json
{
  "qrcode": {
    "code": "2@ABC123...",
    "base64": "data:image/png;base64,iVBORw0..."
  }
}
```

> 💡 O QR Code deve ser escaneado com o app WhatsApp do celular em **Dispositivos Conectados**.

---

### 3. Status da Conexão

**Endpoint:** `GET /{instance}/instance/connectionState`

Verifica o estado atual da conexão.

#### Resposta

```json
{
  "instance": "minha-instancia",
  "state": "open"
}
```

| Estado | Descrição |
|--------|-----------|
| `open` | Conectado e pronto para uso |
| `close` | Desconectado |
| `connecting` | Tentando conectar |

---

### 4. Reiniciar Instância

**Endpoint:** `POST /{instance}/instance/restart`

Reinicia a conexão da instância, útil para resolver problemas de conexão.

#### Resposta

```json
{
  "instance": "minha-instancia",
  "status": "restarted"
}
```

---

### 5. Listar Instâncias

**Endpoint:** `GET /instance/fetchInstances`

Lista todas as instâncias cadastradas.

#### Resposta

```json
[
  {
    "instanceName": "instancia-1",
    "instanceId": "uuid-1",
    "integration": "WHATSAPP-BAILEYS",
    "status": "open",
    "owner": "5511999999999@s.whatsapp.net"
  },
  {
    "instanceName": "instancia-2",
    "instanceId": "uuid-2",
    "integration": "WHATSAPP-BAILEYS",
    "status": "close",
    "owner": null
  }
]
```

---

### 6. Definir Presença

**Endpoint:** `POST /{instance}/instance/setPresence`

Define o status de presença da instância.

```json
{
  "presence": "available"
}
```

| Presença | Descrição |
|----------|-----------|
| `available` | Online |
| `unavailable` | Offline |
| `composing` | Digitando... |
| `recording` | Gravando áudio... |
| `paused` | Parou de digitar |

---

### 7. Logout

**Endpoint:** `DELETE /{instance}/instance/logout`

Desconecta a instância do WhatsApp, removendo a sessão.

#### Resposta

```json
{
  "instance": "minha-instancia",
  "status": "logged out"
}
```

> ⚠️ Após logout, será necessário escanear o QR Code novamente.

---

### 8. Deletar Instância

**Endpoint:** `DELETE /{instance}/instance/delete`

Remove completamente a instância do sistema.

#### Resposta

```json
{
  "instance": "minha-instancia",
  "status": "deleted"
}
```

> ⚠️ Esta ação é irreversível. Todos os dados da instância serão removidos.

---

## Ciclo de Vida da Instância

```
┌─────────┐    ┌─────────────┐    ┌──────────┐    ┌────────┐
│ CREATE  │───▶│   CONNECT   │───▶│  SCAN QR │───▶│  OPEN  │
└─────────┘    └─────────────┘    └──────────┘    └────────┘
                                                       │
                                                       ▼
┌─────────┐    ┌─────────────┐    ┌──────────┐    ┌────────┐
│ DELETE  │◀───│   LOGOUT    │◀───│  CLOSE   │◀───│ ERROR  │
└─────────┘    └─────────────┘    └──────────┘    └────────┘
```

## Persistência de Sessão

A sessão do WhatsApp é persistida automaticamente:

- **Banco de Dados**: Configuração padrão, dados salvos via Prisma
- **Redis**: Se `CACHE_REDIS_SAVE_INSTANCES=true`

Isso permite que a instância reconecte automaticamente após reiniciar o servidor, sem necessidade de novo QR Code.

## Configuração de Auto-Exclusão

```env
# Tempo para deletar instância sem conexão (em minutos)
# false = nunca deletar automaticamente
DEL_INSTANCE=false
```

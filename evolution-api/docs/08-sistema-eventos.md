# Sistema de Eventos

O Evolution API implementa uma arquitetura orientada a eventos que permite que sistemas externos recebam notificações em tempo real sobre atividades do WhatsApp.

## Canais de Eventos Disponíveis

| Canal | Tipo | Descrição |
|-------|------|-----------|
| **Webhook** | HTTP | Callbacks HTTP para URLs configuradas |
| **WebSocket** | Socket.io | Conexão em tempo real via Socket.io |
| **RabbitMQ** | Message Queue | Fila de mensagens AMQP |
| **Amazon SQS** | Cloud Queue | Fila de mensagens AWS |
| **Apache Kafka** | Event Streaming | Streaming de eventos distribuído |
| **NATS** | Messaging | Sistema de mensageria de alta performance |
| **Pusher** | Push | Notificações push em tempo real |

---

## Eventos Disponíveis

### Eventos de Aplicação

| Evento | Descrição |
|--------|-----------|
| `APPLICATION_STARTUP` | API iniciada |
| `INSTANCE_CREATE` | Instância criada |
| `INSTANCE_DELETE` | Instância deletada |
| `QRCODE_UPDATED` | QR Code atualizado |
| `CONNECTION_UPDATE` | Status de conexão alterado |
| `REMOVE_INSTANCE` | Instância removida |
| `LOGOUT_INSTANCE` | Logout realizado |

### Eventos de Mensagens

| Evento | Descrição |
|--------|-----------|
| `MESSAGES_SET` | Histórico de mensagens carregado |
| `MESSAGES_UPSERT` | Nova mensagem recebida |
| `MESSAGES_UPDATE` | Mensagem atualizada |
| `MESSAGES_DELETE` | Mensagem deletada |
| `MESSAGES_EDITED` | Mensagem editada |
| `SEND_MESSAGE` | Mensagem enviada |
| `SEND_MESSAGE_UPDATE` | Status de envio atualizado |

### Eventos de Contatos

| Evento | Descrição |
|--------|-----------|
| `CONTACTS_SET` | Lista de contatos carregada |
| `CONTACTS_UPSERT` | Contato adicionado/atualizado |
| `CONTACTS_UPDATE` | Contato atualizado |

### Eventos de Chats

| Evento | Descrição |
|--------|-----------|
| `CHATS_SET` | Lista de chats carregada |
| `CHATS_UPSERT` | Chat adicionado/atualizado |
| `CHATS_UPDATE` | Chat atualizado |
| `CHATS_DELETE` | Chat deletado |
| `PRESENCE_UPDATE` | Status de presença atualizado |

### Eventos de Grupos

| Evento | Descrição |
|--------|-----------|
| `GROUPS_UPSERT` | Grupo criado/atualizado |
| `GROUPS_UPDATE` | Grupo atualizado |
| `GROUP_PARTICIPANTS_UPDATE` | Participantes atualizados |

### Outros Eventos

| Evento | Descrição |
|--------|-----------|
| `LABELS_EDIT` | Labels editadas |
| `LABELS_ASSOCIATION` | Labels associadas |
| `CALL` | Chamada recebida |
| `TYPEBOT_START` | Typebot iniciado |
| `TYPEBOT_CHANGE_STATUS` | Status do Typebot alterado |
| `ERRORS` | Erros ocorridos |

---

## 1. Webhook

### Configuração Global

```env
WEBHOOK_GLOBAL_ENABLED=false
WEBHOOK_GLOBAL_URL=''
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
WEBHOOK_REQUEST_TIMEOUT_MS=60000
WEBHOOK_RETRY_MAX_ATTEMPTS=10
WEBHOOK_RETRY_INITIAL_DELAY_SECONDS=5
WEBHOOK_RETRY_USE_EXPONENTIAL_BACKOFF=true
WEBHOOK_RETRY_MAX_DELAY_SECONDS=300
WEBHOOK_RETRY_JITTER_FACTOR=0.2
WEBHOOK_RETRY_NON_RETRYABLE_STATUS_CODES=400,401,403,404,422
```

### Configuração por Instância

```json
{
  "webhook": {
    "enabled": true,
    "url": "https://meusite.com/webhook",
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "CONNECTION_UPDATE"
    ],
    "headers": {
      "Authorization": "Bearer token"
    },
    "base64": true,
    "byEvents": false
  }
}
```

### Estrutura do Payload

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "MESSAGE_ID"
    },
    "message": {...},
    "messageTimestamp": "1234567890"
  },
  "date_time": "2024-01-01T12:00:00.000Z",
  "sender": "5511999999999@s.whatsapp.net",
  "server_url": "https://api.example.com",
  "apikey": "api-key-da-instancia"
}
```

### Webhook por Eventos

Quando `byEvents=true`, cada evento é enviado para uma URL diferente:
- `https://meusite.com/webhook/MESSAGES_UPSERT`
- `https://meusite.com/webhook/CONNECTION_UPDATE`

---

## 2. WebSocket (Socket.io)

### Configuração

```env
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=false
WEBSOCKET_ALLOWED_HOSTS=127.0.0.1,::1,::ffff:127.0.0.1
```

### Conexão Cliente

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  transports: ['websocket'],
  auth: {
    apikey: 'sua-api-key'
  }
});

// Escutar eventos de uma instância específica
socket.on('minha-instancia', (data) => {
  console.log('Evento recebido:', data);
});

// Ou escutar eventos globais
socket.on('*', (data) => {
  console.log('Evento global:', data);
});
```

---

## 3. RabbitMQ

### Configuração

```env
RABBITMQ_ENABLED=true
RABBITMQ_URI=amqp://localhost
RABBITMQ_EXCHANGE_NAME=evolution
RABBITMQ_GLOBAL_ENABLED=false
RABBITMQ_PREFIX_KEY=evolution
RABBITMQ_FRAME_MAX=8192
```

### Estrutura de Filas

- **Exchange**: `evolution` (topic)
- **Routing Key**: `evolution.{instanceName}.{eventType}`
- **Fila**: Criada automaticamente por instância/evento

### Consumidor Exemplo (Node.js)

```javascript
const amqp = require('amqplib');

async function consumeEvents() {
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  
  await channel.assertExchange('evolution', 'topic', { durable: true });
  
  const q = await channel.assertQueue('', { exclusive: true });
  
  // Escutar todos os eventos de uma instância
  await channel.bindQueue(q.queue, 'evolution', 'evolution.minha-instancia.*');
  
  channel.consume(q.queue, (msg) => {
    const event = JSON.parse(msg.content.toString());
    console.log('Evento:', event);
  });
}
```

---

## 4. Amazon SQS

### Configuração

```env
SQS_ENABLED=true
SQS_ACCESS_KEY_ID=your-access-key
SQS_SECRET_ACCESS_KEY=your-secret-key
SQS_ACCOUNT_ID=123456789012
SQS_REGION=us-east-1
SQS_GLOBAL_ENABLED=false
SQS_GLOBAL_FORCE_SINGLE_QUEUE=false
```

### Estrutura de Filas

Uma fila é criada para cada instância:
- `evolution-{instanceName}-messages-upsert`
- `evolution-{instanceName}-connection-update`

---

## 5. Apache Kafka

### Configuração

```env
KAFKA_ENABLED=true
KAFKA_CLIENT_ID=evolution-api
KAFKA_BROKERS=localhost:9092
KAFKA_CONNECTION_TIMEOUT=3000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_GLOBAL_ENABLED=false
KAFKA_CONSUMER_GROUP_ID=evolution-api-consumers
KAFKA_TOPIC_PREFIX=evolution
KAFKA_NUM_PARTITIONS=1
KAFKA_REPLICATION_FACTOR=1
KAFKA_AUTO_CREATE_TOPICS=false
```

### SASL Authentication

```env
KAFKA_SASL_ENABLED=true
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=user
KAFKA_SASL_PASSWORD=password
```

### SSL Configuration

```env
KAFKA_SSL_ENABLED=true
KAFKA_SSL_REJECT_UNAUTHORIZED=true
KAFKA_SSL_CA=/path/to/ca.pem
KAFKA_SSL_KEY=/path/to/key.pem
KAFKA_SSL_CERT=/path/to/cert.pem
```

### Estrutura de Tópicos

- `evolution.{instanceName}.messages-upsert`
- `evolution.{instanceName}.connection-update`

---

## 6. NATS

### Configuração

```env
# NATS é configurado programaticamente
```

### Estrutura de Subjects

- `evolution.{instanceName}.messages.upsert`
- `evolution.{instanceName}.connection.update`

---

## 7. Pusher

### Configuração Global

```env
PUSHER_ENABLED=true
PUSHER_GLOBAL_ENABLED=false
PUSHER_GLOBAL_APP_ID=your-app-id
PUSHER_GLOBAL_KEY=your-key
PUSHER_GLOBAL_SECRET=your-secret
PUSHER_GLOBAL_CLUSTER=us2
PUSHER_GLOBAL_USE_TLS=true
```

### Configuração por Instância

```json
{
  "pusher": {
    "enabled": true,
    "appId": "123456",
    "key": "abc123",
    "secret": "xyz789",
    "cluster": "us2",
    "useTLS": true,
    "events": ["MESSAGES_UPSERT"]
  }
}
```

### Cliente JavaScript

```javascript
const Pusher = require('pusher-js');

const pusher = new Pusher('your-key', {
  cluster: 'us2',
  encrypted: true
});

const channel = pusher.subscribe('evolution.minha-instancia');

channel.bind('MESSAGES_UPSERT', (data) => {
  console.log('Nova mensagem:', data);
});
```

---

## Configuração de Eventos por Canal

Todos os canais suportam configuração granular de quais eventos enviar:

```env
# Exemplo para RabbitMQ
RABBITMQ_EVENTS_MESSAGES_UPSERT=true
RABBITMQ_EVENTS_MESSAGES_UPDATE=true
RABBITMQ_EVENTS_CONNECTION_UPDATE=true
RABBITMQ_EVENTS_QRCODE_UPDATED=false
# ... outros eventos
```

## Boas Práticas

1. **Use webhooks** para integrações simples e baixo volume
2. **Use filas (RabbitMQ/SQS/Kafka)** para alto volume e processamento assíncrono
3. **Use WebSocket** para interfaces em tempo real
4. **Configure retry** adequado para webhooks
5. **Monitore filas** para evitar acúmulo de mensagens
6. **Filtre eventos** para receber apenas o necessário

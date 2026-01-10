# Gerenciamento de Chats

Funcionalidades para gerenciar conversas, contatos, perfis e interações no WhatsApp.

## Endpoints de Chat

### 1. Verificar Números WhatsApp

**Endpoint:** `POST /{instance}/chat/whatsappNumbers`

Verifica se números de telefone possuem WhatsApp.

```json
{
  "numbers": [
    "5511999999999",
    "5511888888888",
    "5511777777777"
  ]
}
```

#### Resposta

```json
[
  {
    "exists": true,
    "jid": "5511999999999@s.whatsapp.net",
    "number": "5511999999999"
  },
  {
    "exists": false,
    "jid": null,
    "number": "5511888888888"
  }
]
```

---

### 2. Marcar Mensagem como Lida

**Endpoint:** `POST /{instance}/chat/markMessageAsRead`

```json
{
  "readMessages": [
    {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "MESSAGE_ID"
    }
  ]
}
```

---

### 3. Arquivar Chat

**Endpoint:** `POST /{instance}/chat/archiveChat`

```json
{
  "chat": "5511999999999@s.whatsapp.net",
  "archive": true
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `archive` | boolean | `true` arquiva, `false` desarquiva |

---

### 4. Marcar Chat como Não Lido

**Endpoint:** `POST /{instance}/chat/markChatUnread`

```json
{
  "chat": "5511999999999@s.whatsapp.net"
}
```

---

### 5. Deletar Mensagem para Todos

**Endpoint:** `DELETE /{instance}/chat/deleteMessageForEveryone`

```json
{
  "remoteJid": "5511999999999@s.whatsapp.net",
  "fromMe": true,
  "id": "MESSAGE_ID",
  "participant": "5511888888888@s.whatsapp.net"
}
```

> O campo `participant` é necessário apenas para grupos.

---

### 6. Editar Mensagem

**Endpoint:** `POST /{instance}/chat/updateMessage`

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "MESSAGE_ID"
  },
  "text": "Texto editado da mensagem"
}
```

> ⚠️ Apenas mensagens próprias podem ser editadas, dentro de um limite de tempo.

---

### 7. Enviar Presença

**Endpoint:** `POST /{instance}/chat/sendPresence`

```json
{
  "number": "5511999999999",
  "presence": "composing",
  "delay": 3000
}
```

| Presença | Descrição |
|----------|-----------|
| `composing` | Digitando... |
| `recording` | Gravando áudio... |
| `paused` | Parou de digitar |
| `available` | Online |
| `unavailable` | Offline |

---

### 8. Bloquear/Desbloquear Usuário

**Endpoint:** `POST /{instance}/chat/updateBlockStatus`

```json
{
  "number": "5511999999999",
  "status": "block"
}
```

| Status | Descrição |
|--------|-----------|
| `block` | Bloquear contato |
| `unblock` | Desbloquear contato |

---

## Endpoints de Consulta

### 9. Buscar Contatos

**Endpoint:** `POST /{instance}/chat/findContacts`

```json
{
  "where": {
    "pushName": {
      "contains": "João"
    }
  }
}
```

Suporta filtros Prisma para busca.

---

### 10. Buscar Mensagens

**Endpoint:** `POST /{instance}/chat/findMessages`

```json
{
  "where": {
    "remoteJid": "5511999999999@s.whatsapp.net"
  },
  "limit": 50
}
```

---

### 11. Buscar Status de Mensagens

**Endpoint:** `POST /{instance}/chat/findStatusMessage`

```json
{
  "where": {
    "remoteJid": "5511999999999@s.whatsapp.net"
  }
}
```

Retorna status de entrega/leitura das mensagens.

---

### 12. Buscar Chats

**Endpoint:** `POST /{instance}/chat/findChats`

```json
{
  "where": {}
}
```

Retorna lista de conversas.

---

### 13. Buscar Chat por JID

**Endpoint:** `GET /{instance}/chat/findChatByRemoteJid`

**Query Params:** `?remoteJid=5511999999999@s.whatsapp.net`

---

### 14. Obter Base64 de Mídia

**Endpoint:** `POST /{instance}/chat/getBase64FromMediaMessage`

```json
{
  "message": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "MESSAGE_ID"
    }
  },
  "convertToMp4": false
}
```

Retorna o conteúdo da mídia em Base64.

---

## Endpoints de Perfil

### 15. Buscar Foto de Perfil

**Endpoint:** `POST /{instance}/chat/fetchProfilePictureUrl`

```json
{
  "number": "5511999999999"
}
```

#### Resposta

```json
{
  "profilePictureUrl": "https://pps.whatsapp.net/v/..."
}
```

---

### 16. Buscar Perfil de Negócio

**Endpoint:** `POST /{instance}/chat/fetchBusinessProfile`

```json
{
  "number": "5511999999999"
}
```

Retorna informações do perfil comercial (se disponível).

---

### 17. Buscar Perfil

**Endpoint:** `POST /{instance}/chat/fetchProfile`

```json
{
  "number": "5511999999999"
}
```

---

### 18. Atualizar Nome do Perfil

**Endpoint:** `POST /{instance}/chat/updateProfileName`

```json
{
  "name": "Novo Nome"
}
```

---

### 19. Atualizar Status do Perfil

**Endpoint:** `POST /{instance}/chat/updateProfileStatus`

```json
{
  "status": "Disponível para atendimento"
}
```

---

### 20. Atualizar Foto do Perfil

**Endpoint:** `POST /{instance}/chat/updateProfilePicture`

```json
{
  "picture": "https://example.com/photo.jpg"
}
```

---

### 21. Remover Foto do Perfil

**Endpoint:** `DELETE /{instance}/chat/removeProfilePicture`

---

## Endpoints de Privacidade

### 22. Buscar Configurações de Privacidade

**Endpoint:** `GET /{instance}/chat/fetchPrivacySettings`

#### Resposta

```json
{
  "readreceipts": "all",
  "profile": "contacts",
  "status": "contacts",
  "online": "all",
  "last": "contacts",
  "groupadd": "contacts"
}
```

---

### 23. Atualizar Privacidade

**Endpoint:** `POST /{instance}/chat/updatePrivacySettings`

```json
{
  "readreceipts": "all",
  "profile": "contacts",
  "status": "contacts",
  "online": "all",
  "last": "none",
  "groupadd": "contacts"
}
```

| Configuração | Opções | Descrição |
|--------------|--------|-----------|
| `readreceipts` | `all`, `none` | Confirmação de leitura |
| `profile` | `all`, `contacts`, `contact_blacklist`, `none` | Quem vê foto |
| `status` | `all`, `contacts`, `contact_blacklist`, `none` | Quem vê status |
| `online` | `all`, `match_last_seen` | Quem vê online |
| `last` | `all`, `contacts`, `contact_blacklist`, `none` | Quem vê "visto por último" |
| `groupadd` | `all`, `contacts`, `contact_blacklist` | Quem pode adicionar em grupos |

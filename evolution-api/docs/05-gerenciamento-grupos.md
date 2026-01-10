# Gerenciamento de Grupos

O Evolution API oferece funcionalidades completas para gerenciamento de grupos WhatsApp.

## Endpoints Disponíveis

Todos os endpoints seguem o padrão: `/{instance}/group/{operação}`

### 1. Criar Grupo

**Endpoint:** `POST /{instance}/group/create`

```json
{
  "subject": "Nome do Grupo",
  "description": "Descrição do grupo",
  "participants": [
    "5511999999999",
    "5511888888888"
  ],
  "profilePicture": "https://example.com/group-image.jpg"
}
```

#### Resposta

```json
{
  "id": "123456789@g.us",
  "subject": "Nome do Grupo",
  "subjectOwner": "5511777777777@s.whatsapp.net",
  "creation": 1234567890,
  "size": 3
}
```

---

### 2. Atualizar Assunto do Grupo

**Endpoint:** `POST /{instance}/group/updateGroupSubject`

```json
{
  "groupJid": "123456789@g.us",
  "subject": "Novo Nome do Grupo"
}
```

---

### 3. Atualizar Descrição do Grupo

**Endpoint:** `POST /{instance}/group/updateGroupDescription`

```json
{
  "groupJid": "123456789@g.us",
  "description": "Nova descrição do grupo"
}
```

---

### 4. Atualizar Foto do Grupo

**Endpoint:** `POST /{instance}/group/updateGroupPicture`

```json
{
  "groupJid": "123456789@g.us",
  "image": "https://example.com/new-image.jpg"
}
```

> Suporta URL ou Base64 da imagem.

---

### 5. Buscar Informações do Grupo

**Endpoint:** `GET /{instance}/group/findGroupInfos`

**Query Params:** `?groupJid=123456789@g.us`

#### Resposta

```json
{
  "id": "123456789@g.us",
  "subject": "Nome do Grupo",
  "subjectOwner": "5511999999999@s.whatsapp.net",
  "subjectTime": 1234567890,
  "creation": 1234567890,
  "owner": "5511999999999@s.whatsapp.net",
  "desc": "Descrição do grupo",
  "descId": "DESC123",
  "descOwner": "5511999999999@s.whatsapp.net",
  "size": 10,
  "restrict": false,
  "announce": false,
  "participants": [
    {
      "id": "5511999999999@s.whatsapp.net",
      "admin": "superadmin"
    },
    {
      "id": "5511888888888@s.whatsapp.net",
      "admin": null
    }
  ]
}
```

---

### 6. Listar Todos os Grupos

**Endpoint:** `GET /{instance}/group/fetchAllGroups`

**Query Params (opcionais):**
- `getParticipants=true` - Incluir lista de participantes

#### Resposta

```json
[
  {
    "id": "123456789@g.us",
    "subject": "Grupo 1",
    "size": 10
  },
  {
    "id": "987654321@g.us",
    "subject": "Grupo 2",
    "size": 5
  }
]
```

---

### 7. Listar Participantes

**Endpoint:** `GET /{instance}/group/participants`

**Query Params:** `?groupJid=123456789@g.us`

#### Resposta

```json
{
  "participants": [
    {
      "id": "5511999999999@s.whatsapp.net",
      "admin": "superadmin"
    },
    {
      "id": "5511888888888@s.whatsapp.net",
      "admin": "admin"
    },
    {
      "id": "5511777777777@s.whatsapp.net",
      "admin": null
    }
  ]
}
```

| Tipo Admin | Descrição |
|------------|-----------|
| `superadmin` | Criador do grupo |
| `admin` | Administrador |
| `null` | Participante comum |

---

### 8. Atualizar Participantes

**Endpoint:** `POST /{instance}/group/updateParticipant`

```json
{
  "groupJid": "123456789@g.us",
  "action": "add",
  "participants": ["5511666666666"]
}
```

| Ação | Descrição |
|------|-----------|
| `add` | Adicionar participantes |
| `remove` | Remover participantes |
| `promote` | Promover a administrador |
| `demote` | Rebaixar de administrador |

---

### 9. Código de Convite

**Endpoint:** `GET /{instance}/group/inviteCode`

**Query Params:** `?groupJid=123456789@g.us`

#### Resposta

```json
{
  "inviteCode": "AbCdEfGhIjK",
  "inviteUrl": "https://chat.whatsapp.com/AbCdEfGhIjK"
}
```

---

### 10. Revogar Código de Convite

**Endpoint:** `POST /{instance}/group/revokeInviteCode`

```json
{
  "groupJid": "123456789@g.us"
}
```

> Gera um novo código de convite, invalidando o anterior.

---

### 11. Informações do Convite

**Endpoint:** `GET /{instance}/group/inviteInfo`

**Query Params:** `?inviteCode=AbCdEfGhIjK`

#### Resposta

```json
{
  "id": "123456789@g.us",
  "subject": "Nome do Grupo",
  "size": 10,
  "owner": "5511999999999@s.whatsapp.net"
}
```

---

### 12. Aceitar Convite

**Endpoint:** `GET /{instance}/group/acceptInviteCode`

**Query Params:** `?inviteCode=AbCdEfGhIjK`

Entra no grupo usando o código de convite.

---

### 13. Enviar Convite

**Endpoint:** `POST /{instance}/group/sendInvite`

```json
{
  "groupJid": "123456789@g.us",
  "numbers": ["5511666666666", "5511555555555"],
  "description": "Mensagem de convite personalizada"
}
```

Envia o link de convite via mensagem privada.

---

### 14. Configurações do Grupo

**Endpoint:** `POST /{instance}/group/updateSetting`

```json
{
  "groupJid": "123456789@g.us",
  "action": "announcement"
}
```

| Ação | Descrição |
|------|-----------|
| `announcement` | Apenas admins enviam mensagens |
| `not_announcement` | Todos podem enviar |
| `locked` | Apenas admins editam dados do grupo |
| `unlocked` | Todos podem editar |

---

### 15. Mensagens Temporárias

**Endpoint:** `POST /{instance}/group/toggleEphemeral`

```json
{
  "groupJid": "123456789@g.us",
  "expiration": 604800
}
```

| Expiração | Descrição |
|-----------|-----------|
| `0` | Desativado |
| `86400` | 24 horas |
| `604800` | 7 dias |
| `7776000` | 90 dias |

---

### 16. Sair do Grupo

**Endpoint:** `DELETE /{instance}/group/leaveGroup`

**Query Params:** `?groupJid=123456789@g.us`

Remove a instância do grupo.

---

## Observações

- O **JID do grupo** sempre termina em `@g.us`
- Algumas operações requerem que a instância seja **administradora** do grupo
- Para adicionar participantes, eles devem ter a instância na lista de contatos ou ter interagido anteriormente
- O limite de participantes em um grupo é definido pelo WhatsApp (atualmente ~1024)

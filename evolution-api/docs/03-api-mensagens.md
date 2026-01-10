# API de Mensagens

O Evolution API oferece endpoints completos para envio de diversos tipos de mensagens via WhatsApp.

## Endpoints Disponíveis

Todos os endpoints seguem o padrão: `POST /{instanceName}/message/{tipo}`

### 1. Mensagem de Texto

**Endpoint:** `POST /{instance}/message/sendText`

```json
{
  "number": "5511999999999",
  "text": "Olá, essa é uma mensagem de texto!",
  "delay": 1000,
  "linkPreview": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `number` | string | Sim | Número do destinatário (com código do país) |
| `text` | string | Sim | Conteúdo da mensagem |
| `delay` | number | Não | Atraso em ms antes de enviar |
| `linkPreview` | boolean | Não | Gerar preview de links |

---

### 2. Mensagem de Mídia

**Endpoint:** `POST /{instance}/message/sendMedia`

```json
{
  "number": "5511999999999",
  "mediatype": "image",
  "media": "https://example.com/image.jpg",
  "caption": "Legenda da imagem",
  "fileName": "imagem.jpg"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `number` | string | Sim | Número do destinatário |
| `mediatype` | string | Sim | Tipo: `image`, `video`, `document` |
| `media` | string | Sim | URL ou Base64 da mídia |
| `caption` | string | Não | Legenda da mídia |
| `fileName` | string | Não | Nome do arquivo |
| `mimetype` | string | Não | MIME type do arquivo |

---

### 3. Áudio WhatsApp (PTT)

**Endpoint:** `POST /{instance}/message/sendWhatsAppAudio`

```json
{
  "number": "5511999999999",
  "audio": "https://example.com/audio.mp3"
}
```

> 💡 Este endpoint envia áudio como mensagem de voz (PTT - Push to Talk), similar a gravar pelo app.

---

### 4. Vídeo Circular (PTV)

**Endpoint:** `POST /{instance}/message/sendPtv`

```json
{
  "number": "5511999999999",
  "video": "https://example.com/video.mp4"
}
```

> 💡 Envia vídeo no formato circular, recurso recente do WhatsApp.

---

### 5. Sticker

**Endpoint:** `POST /{instance}/message/sendSticker`

```json
{
  "number": "5511999999999",
  "sticker": "https://example.com/sticker.webp"
}
```

---

### 6. Localização

**Endpoint:** `POST /{instance}/message/sendLocation`

```json
{
  "number": "5511999999999",
  "name": "Nome do Local",
  "address": "Endereço completo",
  "latitude": -23.550520,
  "longitude": -46.633308
}
```

---

### 7. Contato

**Endpoint:** `POST /{instance}/message/sendContact`

```json
{
  "number": "5511999999999",
  "contact": [
    {
      "fullName": "Nome Completo",
      "wuid": "5511888888888",
      "phoneNumber": "+55 11 88888-8888"
    }
  ]
}
```

---

### 8. Reação

**Endpoint:** `POST /{instance}/message/sendReaction`

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": false,
    "id": "MESSAGE_ID"
  },
  "reaction": "👍"
}
```

---

### 9. Enquete (Poll)

**Endpoint:** `POST /{instance}/message/sendPoll`

```json
{
  "number": "5511999999999",
  "name": "Qual sua cor favorita?",
  "selectableCount": 1,
  "values": ["Azul", "Verde", "Vermelho", "Amarelo"]
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Pergunta da enquete |
| `selectableCount` | number | Quantas opções podem ser selecionadas |
| `values` | string[] | Opções de resposta |

---

### 10. Lista

**Endpoint:** `POST /{instance}/message/sendList`

```json
{
  "number": "5511999999999",
  "title": "Menu Principal",
  "description": "Selecione uma opção",
  "buttonText": "Ver opções",
  "footerText": "Powered by Evolution API",
  "sections": [
    {
      "title": "Categoria 1",
      "rows": [
        { "title": "Opção 1", "description": "Descrição da opção 1", "rowId": "opt1" },
        { "title": "Opção 2", "description": "Descrição da opção 2", "rowId": "opt2" }
      ]
    }
  ]
}
```

---

### 11. Botões

**Endpoint:** `POST /{instance}/message/sendButtons`

```json
{
  "number": "5511999999999",
  "title": "Título da mensagem",
  "description": "Descrição da mensagem com botões",
  "footer": "Rodapé",
  "buttons": [
    { "type": "reply", "displayText": "Botão 1", "id": "btn1" },
    { "type": "reply", "displayText": "Botão 2", "id": "btn2" }
  ]
}
```

> ⚠️ **Nota**: Botões podem não funcionar em todas as versões do WhatsApp devido a limitações da API.

---

### 12. Template (Business API)

**Endpoint:** `POST /{instance}/message/sendTemplate`

```json
{
  "number": "5511999999999",
  "name": "template_name",
  "language": "pt_BR",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Valor do parâmetro" }
      ]
    }
  ]
}
```

> 💡 Exclusivo para Meta Business API. Templates devem ser pré-aprovados.

---

### 13. Status (Stories)

**Endpoint:** `POST /{instance}/message/sendStatus`

```json
{
  "type": "text",
  "content": "Texto do status",
  "backgroundColor": "#FF0000",
  "font": 1,
  "statusJidList": ["all"]
}
```

| Tipo | Descrição |
|------|-----------|
| `text` | Status de texto com cor de fundo |
| `image` | Imagem no status |
| `video` | Vídeo no status |
| `audio` | Áudio no status |

---

## Upload de Arquivos

Todos os endpoints de mídia suportam upload via **multipart/form-data**:

```bash
curl -X POST "http://localhost:8080/{instance}/message/sendMedia" \
  -H "apikey: YOUR_API_KEY" \
  -F "number=5511999999999" \
  -F "mediatype=image" \
  -F "caption=Minha imagem" \
  -F "file=@/path/to/image.jpg"
```

## Respostas

### Sucesso (201)

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5XXXXXX"
  },
  "message": { ... },
  "messageTimestamp": "1234567890",
  "status": "PENDING"
}
```

### Erro (400/500)

```json
{
  "error": true,
  "message": "Descrição do erro"
}
```

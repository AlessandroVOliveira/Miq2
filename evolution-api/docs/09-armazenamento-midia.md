# Armazenamento de Mídia

O Evolution API suporta armazenamento de arquivos de mídia em serviços de cloud storage, permitindo centralizar e gerenciar os arquivos recebidos via WhatsApp.

## Opções de Armazenamento

| Serviço | Tipo | Descrição |
|---------|------|-----------|
| **Amazon S3** | Cloud | Serviço de armazenamento da AWS |
| **MinIO** | Self-hosted | Solução S3-compatível auto-hospedada |
| **Local** | Servidor | Armazenamento local (padrão) |

---

## Amazon S3

### Descrição

Amazon Simple Storage Service (S3) é o serviço de armazenamento de objetos da AWS, oferecendo alta durabilidade, disponibilidade e escalabilidade.

### Configuração

```env
S3_ENABLED=true
S3_ACCESS_KEY=your-access-key-id
S3_SECRET_KEY=your-secret-access-key
S3_BUCKET=evolution-media
S3_ENDPOINT=s3.amazonaws.com
S3_REGION=us-east-1
S3_PORT=443
S3_USE_SSL=true
```

### Configuração por Região

```env
# Para região específica
S3_ENDPOINT=s3.us-east-1.amazonaws.com
S3_REGION=us-east-1

# Para região São Paulo
S3_ENDPOINT=s3.sa-east-1.amazonaws.com
S3_REGION=sa-east-1
```

### Política de Bucket Recomendada

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::evolution-media/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::evolution-media"
    }
  ]
}
```

---

## MinIO

### Descrição

[MinIO](https://min.io/) é uma solução de armazenamento de objetos compatível com S3, ideal para auto-hospedagem em ambiente on-premise ou cloud próprio.

### Vantagens do MinIO

- ✅ Open-source e gratuito
- ✅ Totalmente compatível com S3 API
- ✅ Controle total dos dados
- ✅ Fácil deploy via Docker
- ✅ Alta performance

### Configuração

```env
S3_ENABLED=true
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=evolution-media
S3_PORT=9000
S3_ENDPOINT=minio.example.com
S3_USE_SSL=true
S3_REGION=us-east-1
```

### Docker Compose para MinIO

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio
    container_name: minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  minio_data:
```

### Configuração sem SSL (desenvolvimento)

```env
S3_ENABLED=true
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=evolution-media
S3_PORT=9000
S3_ENDPOINT=localhost
S3_USE_SSL=false
S3_REGION=us-east-1
```

---

## Estrutura de Armazenamento

Os arquivos são organizados da seguinte forma:

```
bucket/
├── {instanceName}/
│   ├── images/
│   │   ├── {messageId}.jpg
│   │   └── {messageId}.png
│   ├── videos/
│   │   └── {messageId}.mp4
│   ├── audio/
│   │   ├── {messageId}.ogg
│   │   └── {messageId}.mp3
│   ├── documents/
│   │   ├── {messageId}.pdf
│   │   └── {messageId}.docx
│   └── stickers/
│       └── {messageId}.webp
```

---

## Comportamento do Sistema

### Com S3/MinIO Habilitado

1. Mídia recebida é baixada do WhatsApp
2. Arquivo é enviado para o bucket S3
3. URL pública (ou signed URL) é gerada
4. URL é incluída no evento/webhook

### Sem S3/MinIO

1. Mídia recebida é baixada do WhatsApp
2. Arquivo é armazenado localmente (temporário)
3. Base64 é incluído no evento/webhook (se configurado)

---

## Configuração de Mídia nos Webhooks

### Enviar mídias em Base64

```json
{
  "webhook": {
    "enabled": true,
    "url": "https://meusite.com/webhook",
    "base64": true
  }
}
```

### Enviar apenas URLs

```json
{
  "webhook": {
    "enabled": true,
    "url": "https://meusite.com/webhook",
    "base64": false
  }
}
```

---

## Conversão de Áudio

O Evolution API pode converter áudios para formatos compatíveis usando um serviço externo.

### Configuração

```env
API_AUDIO_CONVERTER=http://localhost:4040/process-audio
API_AUDIO_CONVERTER_KEY=sua-api-key
```

### Evolution Audio Converter

O projeto [Evolution Audio Converter](https://github.com/EvolutionAPI/evolution-audio-converter) pode ser usado para:

- Converter OGG Opus para MP3
- Converter qualquer áudio para formato WhatsApp
- Transcodificar áudios para melhor compatibilidade

---

## Persistência de Dados

### Configurações de Salvamento

```env
# Salvar dados da instância
DATABASE_SAVE_DATA_INSTANCE=true

# Salvar novas mensagens
DATABASE_SAVE_DATA_NEW_MESSAGE=true

# Salvar atualizações de mensagens
DATABASE_SAVE_MESSAGE_UPDATE=true

# Salvar contatos
DATABASE_SAVE_DATA_CONTACTS=true

# Salvar chats
DATABASE_SAVE_DATA_CHATS=true

# Salvar labels
DATABASE_SAVE_DATA_LABELS=true

# Salvar histórico
DATABASE_SAVE_DATA_HISTORIC=true

# Cache de verificação WhatsApp
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7

# Deletar mensagens
DATABASE_DELETE_MESSAGE=true
```

---

## Boas Práticas

### Segurança

1. **Use credenciais IAM** específicas para o Evolution API
2. **Limite permissões** apenas ao necessário (PutObject, GetObject)
3. **Ative SSL** sempre em produção
4. **Configure políticas de retenção** para evitar acúmulo

### Performance

1. **Use região próxima** ao servidor da API
2. **Configure CDN** para distribuição de mídia
3. **Ative cache** de URLs assinadas

### Custos (AWS S3)

| Item | Recomendação |
|------|--------------|
| Classe de Storage | S3 Standard para acesso frequente |
| Lifecycle Policy | Mover para S3-IA após 30 dias |
| Replicação | Opcional, para alta disponibilidade |

---

## Troubleshooting

### Erro de Conexão S3

```
Error: connect ECONNREFUSED
```

**Solução**: Verifique se o endpoint e porta estão corretos.

### Erro de Autenticação

```
Error: InvalidAccessKeyId
```

**Solução**: Verifique as credenciais S3_ACCESS_KEY e S3_SECRET_KEY.

### Bucket não encontrado

```
Error: NoSuchBucket
```

**Solução**: Crie o bucket manualmente antes de iniciar a API.

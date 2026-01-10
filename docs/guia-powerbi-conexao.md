# 📊 Guia: Conectando Power BI ao Miq2

Este guia explica como configurar o Power BI para acessar os dados do Miq2, tanto em ambiente local quanto na nuvem.

---

## 🤔 Entendendo o Conceito

### O que é uma URL?

Uma URL é como o "endereço" de um site ou serviço na internet. Assim como sua casa tem um endereço (Rua X, Número Y), os sistemas também têm endereços para serem acessados.

### Diferença entre Local e Nuvem

| Situação | O que significa | Exemplo de URL |
|----------|-----------------|----------------|
| **Localhost** | O sistema está rodando **no seu computador** | `http://localhost:8000` |
| **Nuvem** | O sistema está em um **servidor na internet** | `http://miq2.suaempresa.com` |

> 💡 **Localhost** = "host local" = "meu próprio computador"

---

## 🏠 Quando usar localhost (ambiente local)

Use `localhost` quando:
- ✅ Você está testando no seu computador
- ✅ O Miq2 está rodando na sua máquina
- ✅ O Power BI está no **mesmo computador** que o Miq2

**Exemplo de URL:**
```
http://localhost:8000/dashboard/conversations-by-period?start_date=2024-01-01&end_date=2024-12-31
```

---

## ☁️ Quando usar URL da nuvem (ambiente de produção)

Quando o Miq2 for hospedado em um servidor na internet (AWS, Azure, DigitalOcean, etc.), você precisará usar o endereço público desse servidor.

### Opção 1: Usar o IP do servidor

Se seu servidor tem o IP `203.0.113.50`, a URL será:
```
http://203.0.113.50:8000/dashboard/conversations-by-period?start_date=2024-01-01&end_date=2024-12-31
```

### Opção 2: Usar um domínio (recomendado)

Se você configurou um domínio como `api.miq2.suaempresa.com`, a URL será:
```
https://api.miq2.suaempresa.com/dashboard/conversations-by-period?start_date=2024-01-01&end_date=2024-12-31
```

> 🔒 Note o **https** (com S) - isso significa que a conexão é segura e criptografada.

---

## 🔧 Como configurar no Power BI

### Passo 1: Criar um Parâmetro para a URL Base

Isso facilita trocar de "localhost" para "nuvem" sem editar cada conexão.

1. No Power BI Desktop, vá em **Página Inicial** → **Gerenciar Parâmetros** → **Novo Parâmetro**
2. Configure assim:

| Campo | Valor |
|-------|-------|
| Nome | `URL_Base` |
| Tipo | Texto |
| Valor Atual | `http://localhost:8000` |

3. Clique em **OK**

### Passo 2: Usar o Parâmetro nas Conexões

Ao criar uma nova fonte de dados Web, em vez de digitar a URL completa, use:

```
URL_Base & "/dashboard/conversations-by-period?start_date=2024-01-01&end_date=2024-12-31"
```

### Passo 3: Trocar para Produção

Quando migrar para a nuvem, basta:

1. Ir em **Página Inicial** → **Gerenciar Parâmetros**
2. Mudar o valor de `URL_Base` para o endereço da nuvem:
   - De: `http://localhost:8000`
   - Para: `https://api.miq2.suaempresa.com`
3. Clicar em **Atualizar** para recarregar os dados

---

## 📋 Lista de Endpoints Disponíveis

Estes são os "caminhos" que você pode adicionar após a URL base:

| O que mostra | Caminho do Endpoint |
|--------------|---------------------|
| Conversas por período | `/dashboard/conversations-by-period` |
| Conversas por status | `/dashboard/conversations-by-status` |
| Conversas por equipe | `/dashboard/conversations-by-team` |
| Conversas por atendente | `/dashboard/conversations-by-attendant` |
| Tempo médio de atendimento | `/dashboard/average-service-time` |
| Conversas por hora | `/dashboard/conversations-by-hour` |

### Parâmetros obrigatórios

Todos os endpoints precisam de datas no formato **AAAA-MM-DD**:

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `start_date` | Data inicial | `2024-01-01` |
| `end_date` | Data final | `2024-12-31` |

**Exemplo completo:**
```
https://api.miq2.suaempresa.com/dashboard/conversations-by-period?start_date=2024-01-01&end_date=2024-12-31
```

---

## 🔐 Autenticação (Segurança)

Os endpoints do dashboard são **públicos** dentro da rede, ou seja, não precisam de login para acessar. Isso facilita a integração com Power BI.

> ⚠️ **Importante:** Se o sistema estiver exposto na internet, considere adicionar uma camada de segurança como VPN ou autenticação básica no servidor.

---

## ❓ Perguntas Frequentes

### "Funciona se o Power BI estiver em outro computador?"

**Em rede local:** Sim! Use o IP do computador onde o Miq2 está rodando.
- Exemplo: `http://192.168.1.100:8000/dashboard/...`

**Na nuvem:** Sim! Qualquer computador com internet pode acessar.
- Exemplo: `https://api.miq2.suaempresa.com/dashboard/...`

### "O que acontece se eu usar localhost e o Miq2 estiver em outro lugar?"

O Power BI vai dar erro de conexão, pois ele vai procurar o sistema no seu próprio computador e não vai encontrar.

### "Preciso de alguma configuração especial no servidor?"

Sim, você precisa garantir que:
1. A porta 8000 esteja aberta no firewall
2. O Docker esteja rodando com o Miq2
3. (Recomendado) Um certificado SSL para usar HTTPS

---

## 📞 Resumo Rápido

| Pergunta | Resposta |
|----------|----------|
| Estou testando no meu PC? | Use `http://localhost:8000` |
| O Miq2 está em outro PC na rede? | Use `http://IP_DO_PC:8000` |
| O Miq2 está na nuvem? | Use `http://IP_DO_SERVIDOR:8000` ou `https://seu-dominio.com` |

---

*Documento criado em: Janeiro 2026*
*Versão: 1.0*

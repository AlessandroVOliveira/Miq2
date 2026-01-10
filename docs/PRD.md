# Product Requirements Document (PRD)
## Miq2 - Sistema Integrado de Gestão e Service Desk

---

## 1. Introdução

### 1.1 Propósito
Este documento descreve os requisitos do produto **Miq2**, um sistema integrado de gestão de projetos, serviços e atendimento (Service Desk) desenvolvido para a **Acesso Informática**.

### 1.2 Escopo
O Miq2 centraliza:
- Controle de implantações de ERP
- Gestão de agendas técnicas
- Atendimento ao cliente (omnichannel)
- Repositório de artefatos técnicos

### 1.3 Stakeholders
| Papel | Responsabilidade |
|-------|------------------|
| **Administrador** | Configuração do sistema, gestão de usuários e permissões |
| **Usuário (Técnico/Atendente)** | Execução de implantações, atendimento, gestão de tarefas |
| **Cliente** | Interação via WhatsApp/Chatbot para suporte e consultas |

---

## 2. Visão do Produto

### 2.1 Problema
A Acesso Informática enfrenta fragmentação de informação em três pilares operacionais:
1. **Implantação de ERP** - Falta de controle preciso de etapas e cronogramas
2. **Gestão de Serviços** - Demandas de hardware e suporte sem centralização
3. **Rotinas Internas** - Ausência de repositório unificado para artefatos técnicos

### 2.2 Solução
O Miq2 resolve esses problemas através de:

| Pilar | Solução |
|-------|---------|
| Gestão Visual de Projetos | Dashboards com Gráfico de Gantt |
| Central de Atendimento | Chat omnichannel integrado ao WhatsApp |
| Repositório Inteligente | GED com versionamento para artefatos |
| Gestão de Agendas | Calendário híbrido (longo prazo + pontuais) |

---

## 3. Requisitos Funcionais

### 3.1 Administrador

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-A01 | Cadastrar equipes/times | Alta |
| RF-A02 | Cadastrar cargos e atribuir usuários | Alta |
| RF-A03 | Definir permissões granulares por cargo | Alta |
| RF-A04 | Atribuir usuários a equipes | Alta |
| RF-A05 | Cadastrar clientes e contatos | Alta |
| RF-A06 | Visualizar histórico completo do cliente | Alta |
| RF-A07 | Cadastrar produtos e checklists de implantação | Alta |
| RF-A08 | Cadastrar modelos de O.S. para manutenção | Média |
| RF-A09 | Cadastrar formato de relatório de implantação | Média |
| RF-A10 | Visualizar dashboard de cronograma geral | Alta |
| RF-A11 | Visualizar aba de Sprint semanal | Média |
| RF-A12 | Gerar pauta automática de reunião | Média |
| RF-A13 | Receber notificações de atrasos via e-mail | Média |
| RF-A14 | Monitorar fila de atendimento em tempo real | Alta |

### 3.2 Usuário (Técnico/Atendente)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-U01 | Ter equipe e cargo atribuídos | Alta |
| RF-U02 | Visualizar tarefas e chamados atribuídos | Alta |
| RF-U03 | Agendar tarefas em dashboard/calendário | Alta |
| RF-U04 | Iniciar e finalizar implantações (checklists) | Alta |
| RF-U05 | Gerar e gerenciar Ordens de Serviço | Média |
| RF-U06 | Sinalizar impedimentos pausando SLA | Média |
| RF-U07 | Registrar observações/diário de bordo | Baixa |
| RF-U08 | Dashboards separados (Agenda vs Implantação) | Alta |
| RF-U09 | Anexar termos de aceite assinados | Média |
| RF-U10 | Acessar repositório de documentos versionados | Média |
| RF-U11 | Acessar tela de suporte omnichannel | Alta |
| RF-U12 | Transferir chamados entre setores/usuários | Alta |
| RF-U13 | Utilizar respostas rápidas no chat | Média |

### 3.3 Cliente (via WhatsApp/Chatbot)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-C01 | Interagir com menu de triagem | Alta |
| RF-C02 | Consultar disponibilidade e solicitar agendamento | Média |
| RF-C03 | Consultar status de implantação/manutenção | Alta |
| RF-C04 | Consultar pendências financeiras | Alta |
| RF-C05 | Obter segunda via de boleto automaticamente | Alta |

---

## 4. Requisitos Não Funcionais

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-01 | Interface | Simples com ícones modernos |
| RNF-02 | Dashboards | Dinâmicas e responsivas |
| RNF-03 | Hospedagem | Web (On-Premise/Intranet) |
| RNF-04 | Banco de Dados | PostgreSQL (local) |
| RNF-05 | Armazenamento | File System/Object Storage para arquivos grandes |
| RNF-06 | Integração WhatsApp | API Oficial (WABA) |
| RNF-07 | Integração Financeira | API do sistema financeiro Acesso |
| RNF-08 | Desempenho | Tempo de resposta < 2s para operações comuns |
| RNF-09 | Segurança | Autenticação JWT, HTTPS, dados criptografados |
| RNF-10 | Escalabilidade | Suporte a múltiplos usuários simultâneos |

---

## 5. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│   │  Dashboard  │  │   Agenda    │  │    Chat     │         │
│   │   (Gantt)   │  │ (Calendar)  │  │ (Omnichannel)│        │
│   └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (API REST)                       │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │   Auth   │  │ Projects │  │ Services │  │   Chat   │   │
│   │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  PostgreSQL  │   │ Object Store │   │    Redis     │
   │   Database   │   │   (MinIO)    │   │    Cache     │
   └──────────────┘   └──────────────┘   └──────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
   ┌──────────────┐                       ┌──────────────┐
   │  WhatsApp    │                       │  Financeiro  │
   │  Business    │                       │  API Acesso  │
   │    (WABA)    │                       │              │
   └──────────────┘                       └──────────────┘
```

---

## 6. User Stories Principais

### Epic 1: Gestão de Implantações

> **US-01**: Como administrador, quero cadastrar produtos com seus checklists de implantação para que novos clientes possam ser configurados rapidamente.

> **US-02**: Como técnico, quero visualizar o progresso da implantação em um gráfico de Gantt para acompanhar o cronograma.

> **US-03**: Como técnico, quero marcar itens do checklist como concluídos para que o sistema calcule automaticamente o percentual de completude.

### Epic 2: Ordens de Serviço

> **US-04**: Como técnico, quero registrar a entrada de um equipamento para manutenção gerando uma O.S. automaticamente.

> **US-05**: Como cliente, quero consultar o status da manutenção do meu equipamento via WhatsApp.

### Epic 3: Atendimento Omnichannel

> **US-06**: Como atendente, quero receber mensagens do WhatsApp em uma tela centralizada para atender múltiplos clientes.

> **US-07**: Como cliente, quero selecionar o departamento desejado através de um menu no WhatsApp.

> **US-08**: Como cliente, quero receber a segunda via do meu boleto automaticamente pelo WhatsApp.

---

## 7. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Redução do tempo de implantação | 20% |
| Satisfação do cliente (NPS) | > 8.0 |
| Tempo médio de resposta no chat | < 5 minutos |
| Taxa de resolução no primeiro contato | > 70% |
| Adoção do sistema pelos técnicos | 100% |

---

## 8. Cronograma de Alto Nível

| Fase | Duração | Entrega |
|------|---------|---------|
| Fase 1: Fundação | 4 semanas | Core do sistema |
| Fase 2: Implantações | 4 semanas | Módulo de implantações |
| Fase 3: OS e Agenda | 4 semanas | Ordens de serviço e calendário |
| Fase 4: Sprint | 2 semanas | Reuniões e notificações |
| Fase 5: Repositório | 3 semanas | GED e dashboards |
| Fase 6: Atendimento* | 4 semanas | Integração com WhatsApp existente |
| Fase 7: Chatbot* | 3 semanas | Integração com chatbot existente |

> *Fases 6 e 7: A empresa já possui sistema de WhatsApp e chatbot. Estas fases focam na integração com os sistemas existentes.

**Total estimado: 24 semanas (6 meses)**

---

## 9. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Atraso na integração WhatsApp | Alto | Média | Iniciar aprovação WABA antecipadamente |
| Resistência à adoção | Médio | Média | Treinamento e suporte contínuo |
| Complexidade do Gantt | Médio | Baixa | Usar biblioteca consolidada (ex: DHTMLX) |
| API Financeira instável | Alto | Baixa | Implementar fallbacks e cache |

---

## 10. Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Product Owner | | | |
| Tech Lead | | | |
| Stakeholder | | | |

---

*Documento atualizado em: Janeiro 2026*
*Versão: 1.0*

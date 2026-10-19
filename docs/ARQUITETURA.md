# Arquitetura — NOVAGENTE ATENDIMENTO COM AGENDAMENTO

Diagrama de arquitetura renderizado pelo GitHub usando Mermaid. Representa a implementação e suas integrações opcionais, sem confundir recursos prontos com planejados.

## Organograma geral

```mermaid
flowchart TB
  U["Equipe e clientes<br/>PWA Android • iPhone • Computador"] --> N["PAINEL NOVAGENTE<br/>HTTPS • Login • Interface Next.js"]
  N --> C["Atendimento e CRM<br/>Leads • Conversas • Funil"]
  N --> A["Agendamento<br/>Eventos e link Meet"]
  N --> M["Memória Inteligente<br/>Gravação autorizada"]
  N --> T["Tarefas<br/>Aprovação humana"]
  C <--> W["WAHA<br/>WhatsApp"]
  A <--> G["Google Agenda / Meet<br/>Conexão autorizada"]
  C --> DB[("PostgreSQL")]
  A --> DB
  M --> AR[("Arquivos de áudio<br/>isolados por empresa")]
  M --> DB
  AR --> FW["Faster-Whisper<br/>Transcrição local"]
  FW --> DB
  M -.->|"Só texto, com autorização"| IA["Modelo de IA<br/>Resumo e sugestões"]
  IA -.-> T
  T --> DB
```

## Organograma técnico por camadas

```mermaid
flowchart LR
  subgraph DISPOSITIVO["Dispositivos"]
    PWA["PWA + Service Worker<br/>Cache apenas estático"]
    REC["Microfone / áudio da aba<br/>permissão de gravação"]
  end
  subgraph ACESSO["Acesso"]
    HTTPS["HTTPS • Tailscale<br/>Atual: somente rede privada"]
  end
  subgraph CRM["PAINEL NOVAGENTE • Next.js"]
    AUTH["Autenticação e empresa"]
    WEB["Atendimento / Vendas"]
    CAL["Agenda / Contatos"]
    MEM["Memória / Análise"]
    TASK["Tarefas aprovadas"]
  end
  subgraph PRIVADO["Dados privados"]
    PG[("PostgreSQL 16")]
    VOL[("Volume de gravações")]
  end
  subgraph LOCAL["Serviços locais"]
    WAHA["WAHA"]
    ASR["Worker Faster-Whisper"]
  end
  subgraph FORA["Provedores opcionais"]
    GOOGLE["Google Agenda/Meet"]
    LLM["IA do cliente"]
  end
  PWA --> HTTPS --> AUTH
  REC --> HTTPS
  AUTH --> WEB & CAL & MEM & TASK
  WEB <--> WAHA
  WEB --> PG
  CAL --> PG
  CAL <--> GOOGLE
  MEM --> VOL & PG
  ASR <--> VOL
  ASR --> PG
  MEM -.->|"Opt-in só transcrição"| LLM
  LLM -.-> TASK
  TASK --> PG
```

## Fluxos operacionais

### Atendimento e agenda
1. WhatsApp chega pelo WAHA; o webhook assinado registra contatos e conversas no CRM.
2. A equipe classifica a oportunidade e realiza agendamento pelo módulo Agenda.
3. O link Google Meet depende de autorização e configuração do conector Google do cliente; não é criado sem credenciais.

### Gravação, transcrição e tarefas
1. Participantes são informados, o operador confirma autorização e inicia gravação ou importa áudio.
2. A API autenticada verifica arquivo e empresa, salva o áudio no volume privado e os metadados no PostgreSQL.
3. Faster-Whisper faz a transcrição local. A IA remota recebe somente texto com autorização do usuário.
4. As propostas de ação viram tarefas somente após aprovação humana.

### PWA e privacidade
- App instalável via HTTPS; mantém autenticação e permissões por empresa.
- Service worker guarda só tela pública offline e arquivos estáticos versionados.
- Nada de respostas de API, HTML autenticado, contatos, agendas, gravações ou transcrições em cache offline.
- O PWA usa a mesma aplicação Next.js; não é um segundo banco de dados.

## Onde fica cada componente

| Camada | Código |
|---|---|
| PWA | public/manifest.webmanifest, public/sw.js, src/components/pwa |
| CRM | src/app/(app), src/server/inbox |
| WhatsApp | src/server/waha, src/app/api/webhooks/waha |
| Agendamentos | src/server/agenda, src/app/(app)/bookings |
| Memória | src/app/(app)/memoria, src/app/api/meeting-memory |
| Transcrição | services/meeting-worker, Dockerfile.meeting-worker |
| Banco e migrações | src/lib/db/schema.ts, drizzle |
| Implantação | compose.waha-standalone.yml |

## Limites conhecidos

**Em funcionamento na arquitetura:** painel CRM, integração técnica WAHA, agenda, gravação autorizada via navegador, importação de áudio, memória e tarefas aprovadas; worker de transcrição separado.

**Necessita configurar por cliente:** pareamento do WhatsApp, conta Google autorizada para evento e link Meet, provedor de IA e consentimento para análise externa.

**Planejado:** bot que entra em reuniões, identificação nominal de vozes, push de tarefas, retenção/apagamento automatizados e acesso público com domínio e políticas para clientes. O repositório continua privado até decisão do proprietário.

Consulte [PWA](PWA.md) e [Memória Inteligente](MEMORIA-INTELIGENTE-NOVAGENTE.md).

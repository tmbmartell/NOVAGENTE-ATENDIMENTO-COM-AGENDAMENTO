# Vocero CRM + WAHA (instalacao standalone)

Este clone fica isolado em /srv/novagente-vocero e mantem banco PostgreSQL,
armazenamento de arquivos, sessao WAHA e credenciais proprias. Nao reutilizar
os outros containers WAHA instalados nesta VPS.

## Executar (quando Docker Compose v2 estiver disponivel)

    cd /srv/novagente-vocero
    sudo docker compose --env-file .env.waha -f compose.waha-standalone.yml config --quiet
    sudo docker compose --env-file .env.waha -f compose.waha-standalone.yml up -d --build

O CRM fica em 127.0.0.1:18080 e WAHA em 127.0.0.1:18081.
Os enderecos NAO sao expostos a internet. Use tunel SSH ou reverse proxy
com TLS e autenticacao para acessar.

No dashboard WAHA, crie a sessao novagente e leia o QR com o WhatsApp.
O webhook interno ja e configurado pelo compose.

## Funcionalidades implementadas

- Recebimento de texto por webhook com validacao HMAC-SHA512 obrigatoria
- Isolamento por nome da sessao WAHA
- Filtro de grupos e de mensagens proprias
- Deduplicacao por id de evento no banco
- Suporte a numero tradicional e chat @lid
- Envio de texto e arquivos a partir do CRM
- Preserva caixa de entrada, funil, agente de IA e API externa
- Quando WAHA_ENABLED nao esta ativo, usa o transporte Meta original

## Limitacoes da primeira adaptacao

- Midias recebidas sao registradas como aviso textual, sem download
- Recibos de entrega e leitura ainda nao estao sincronizados
- Respostas manuais pelo app do WhatsApp ainda nao geram eco/handoff
- Templates, envio estruturado de contatos/localizacao nao foram adaptados
- O QR continua no dashboard WAHA, nao dentro do CRM
- Nao foi realizado teste ponta a ponta com numero real

O WAHA utiliza interface nao oficial do WhatsApp e pode gerar bloqueio
da conta. Usar exclusivamente com consentimento e politica de privacidade.
Apos cadastrar o primeiro admin, alterar ALLOW_SIGNUP para false.
Antes de usar comercialmente, testar seguranca, backup, logs e restauracao.

Documentacao oficial WAHA: https://waha.devlike.pro/docs/how-to/events/

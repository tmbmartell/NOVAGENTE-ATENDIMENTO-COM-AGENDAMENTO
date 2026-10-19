# Memória Inteligente — arquitetura e operação

## Etapas
1. Usuário autenticado informa finalidade, compromisso e autorização de gravação.
2. Captação visível via MediaRecorder, getUserMedia e, opcionalmente, getDisplayMedia para aba + microfone.
3. Envio seguro para POST /api/meeting-memory com limite de 40 MB, assinatura de mídia verificada e registro de consentimento.
4. Áudio salvo no volume local por organização; somente GET autenticado no mesmo tenant permite reprodução.
5. Worker Faster-Whisper, ativado pelo profile transcription, consulta fila no Postgres com FOR UPDATE SKIP LOCKED, gera texto em português e etiquetas preliminares sem serviço de transcrição externo.
6. Revisão de transcrição na interface, classificação local padrão ou análise via provedor de IA previamente configurado quando o usuário permite compartilhar a transcrição.
7. Ações propostas passam por aprovação humana e são salvas por empresa. Tarefas podem ser marcadas como pendentes, em andamento ou concluídas.

## Componentes
- Interface em src/app/(app)/memoria e src/components/meeting-memory.
- API em src/app/api/meeting-memory.
- Migração em drizzle/0021_memoria_novagente.sql.
- Processador local em services/meeting-worker e Dockerfile.meeting-worker.
- Ativação via compose.waha-standalone.yml com profile transcription.

## Limites técnicos e legais
- Google Meet é gerado pelo conector de agenda existente quando autenticado. A captura de áudio é separada e independente da gravação nativa do Google.
- Dependência das permissões do navegador; Chrome ou Edge normalmente oferecem melhor compatibilidade de áudio de aba. Firefox pode não oferecer captura de áudio de aba.
- MVP guarda áudio (não vídeo), em gravações de até 40 MB.
- Transcrição com Faster-Whisper sem diarização nominal. O modelo pode precisar de download inicial e usa CPU/memória da VPS.
- A IA local preliminar detecta palavras-chave; não inventa decisões. Extração semântica de compromissos exige modelo configurado e autorização para enviar texto ao provedor escolhido.
- Ainda não há bot participante entrando automaticamente, notificações ativas de tarefas, atribuição visual a membros, limites por organização, prazo automático de retenção/exclusão ou criptografia adicional de arquivos em repouso. Esses recursos devem ser concluídos antes de produção comercial.
- Todos os participantes devem ser informados da gravação e aplicam-se regras do Meet e LGPD.

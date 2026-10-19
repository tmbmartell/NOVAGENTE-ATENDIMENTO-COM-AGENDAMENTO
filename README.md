# NOVAGENTE ATENDIMENTO COM AGENDAMENTO

**PAINEL NOVAGENTE** — atendimento WhatsApp, oportunidades, agenda e memória inteligente de reuniões.

## O que está implementado

- WhatsApp conectado via WAHA (sessão individual), CRM, contatos, oportunidades e indicadores;
- Agenda interna com conectores de videoconferência existentes (dependem da autenticação de cada conta);
- **Memória Inteligente** na rota /memoria: gravação pelo navegador (microfone ou áudio de aba em navegador compatível), importação de áudio, vínculo com compromissos, histórico e reprodução;
- Transcrição local com Faster-Whisper CPU pelo serviço Docker opcional meeting-worker;
- Classificação básica offline e análise de decisões, objeções e tarefas via provedor de IA configurado quando houver autorização explícita;
- Aprovação humana de tarefas e atualização do andamento.

## Implantação

1. Configure os segredos e APP_BASE_URL em .env.waha (não versionar).
2. CRM e WAHA: docker compose --env-file .env.waha -f compose.waha-standalone.yml up -d --build
3. Transcritor local: docker compose --env-file .env.waha -f compose.waha-standalone.yml --profile transcription up -d --build meeting-worker
4. Cadastre o administrador. Conecte WAHA e Google Agenda (se quiser links Meet) por organização.
5. Para captar áudio do Meet, compartilhe uma aba com áudio via navegador compatível. A gravação é independente das funções pagas de gravação do Google.

Veja docs/MEMORIA-INTELIGENTE-NOVAGENTE.md e docs/WAHA-NOVAGENTE.md.

## Segurança e limites

Login obrigatório, arquivos por organização, autorização registrada para gravação e confirmação antes de transmitir transcrições a modelos de IA externos. Limite atual 40 MB. A transcrição local não cria tarefas inventadas: a análise semântica precisa de um modelo configurado e consentimento. A identificação nominal dos participantes, o bot autônomo que entra em chamadas e a retenção/exclusão completa são fases seguintes, não disponíveis agora. Cumpra as regras do Meet e a LGPD.

## Origem e licença

Produto independente NOVAGENTE construído a partir da base open source Vocero CRM (https://github.com/kevinrivm/vocero-crm). A licença MIT e os créditos originais permanecem no arquivo LICENSE. Não há parceria com os autores da base.


### Outras plataformas

Os arquivos históricos de implantação [Render](render.yaml), [Fly.io](fly.toml) e [Railway](railway.toml) estão preservados como referências técnicas. Para a NOVAGENTE com WAHA e transcrição use o Compose independente descrito acima.

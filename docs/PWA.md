# PAINEL NOVAGENTE — instalar como aplicativo (PWA)

Esta instalação funciona como **Progressive Web App**, sem APK nem loja de aplicativos. Usa a mesma URL, banco de dados, login, WhatsApp, agenda e memória da versão web.

## Pré-requisitos

- Abrir pelo endereço HTTPS com acesso autorizado.
- Na instalação atual da Hostinger é necessário estar conectado à rede Tailscale.
- Fazer login normalmente: instalar o app não elimina autenticação, e os dados não ficam disponíveis offline.

## Android (Chrome / Edge)

1. Abra o painel no navegador, conectado ao Tailscale.
2. Toque no menu e em **Instalar aplicativo** ou **Adicionar à tela inicial**.
3. Quando aparecer o botão **Instalar PAINEL NOVAGENTE** no próprio site, também poderá usá-lo.

## iPhone / iPad (Safari)

1. Abra o painel pelo Safari, conectado ao Tailscale.
2. Toque em **Compartilhar**, depois **Adicionar à Tela de Início**.
3. Confirme **NOVAGENTE** e use o ícone criado na tela inicial.

## Computador (Chrome / Edge)

1. Abra o painel HTTPS.
2. Use o ícone de instalação da barra de endereços ou a opção no menu.
3. O PAINEL NOVAGENTE abre numa janela própria, com seu ícone.

## Privacidade e funcionamento offline

O service worker faz cache somente da tela pública sem conexão, ícones e arquivos estáticos versionados. Nunca salva páginas privadas, sessões, respostas de API, contatos, gravações ou transcrições. Se perder a rede, a tela offline orienta reconectar. **Atendimentos e gravação não funcionam offline.**

## Arquivos

- public/manifest.webmanifest — nome, identidade, escopo, ícones, ponto de entrada.
- public/icons — 192px, 512px, maskable e Apple Touch.
- public/sw.js — cache seguro com tela offline genérica.
- public/offline.html — fallback sem dados de clientes.
- src/components/pwa/pwa-runtime.tsx — instalação, service worker e alerta de conectividade.
- src/app/layout.tsx — manifesto, metadados e aparência no telefone.
- next.config.ts — headers de cache do service worker.

## A conferir em cada dispositivo

- O suporte à instalação varia conforme navegador e sistema.
- No iOS, o Safari usa Adicionar à Tela de Início; não depende do evento beforeinstallprompt.
- Ícone e tela offline podem ser testados mesmo sem vincular WhatsApp.
- Atualizações usam o mesmo URL. Se a aparência ficar antiga, feche e reabra o app.

Veja o [organograma de arquitetura](ARQUITETURA.md).

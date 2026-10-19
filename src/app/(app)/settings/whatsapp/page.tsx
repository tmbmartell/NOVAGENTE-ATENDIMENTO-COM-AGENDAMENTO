import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink, MessageCircleMore, QrCode, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { WhatsappWizard } from "@/components/settings/whatsapp-wizard";
import { wahaEnabled } from "@/server/waha/config";
import { wahaSessionStatus } from "@/server/waha/client";

export const dynamic = "force-dynamic";
const translated: Record<string,string> = {
  WORKING: "Conectado", SCAN_QR_CODE: "Aguardando leitura do QR Code",
  STARTING: "Iniciando", STOPPED: "Desconectado",
  FAILED: "Falha na conexão", NOT_CREATED: "Sessão ainda não criada",
  OFFLINE: "Serviço indisponível",
};

export default async function WhatsappSettingsPage() {
  if (!wahaEnabled()) return <WhatsappWizard />;
  let status = "OFFLINE";
  try { status = await wahaSessionStatus(); } catch { /* sem conexão */ }
  const connected = status === "WORKING";
  const dashboard = process.env.WAHA_DASHBOARD_URL?.trim() || null;
  return (
    <section className="h-full overflow-y-auto bg-subtle">
      <div className="mx-auto max-w-[900px] space-y-6 p-4 sm:p-7">
        <header>
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-text-3">CANAIS / WHATSAPP</span>
          <h1 className="text-2xl font-[780] tracking-tight">Conectar WhatsApp</h1>
          <p className="mt-1 text-sm text-text-2">Receba mensagens no Painel NOVAGENTE e acompanhe os atendimentos em um só lugar.</p>
        </header>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f7ee] text-[#15845d]"><MessageCircleMore className="h-7 w-7"/></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Canal WhatsApp</h2>
              <p className="mt-1 text-sm text-text-2">{translated[status] || status}</p>
            </div>
            <span className={connected ? "inline-flex items-center gap-2 rounded-full bg-[#e2f4e8] px-3 py-1.5 text-xs font-semibold text-[#247c51]" : "inline-flex items-center gap-2 rounded-full bg-[#fff5e2] px-3 py-1.5 text-xs font-semibold text-[#96682e]"}>
              {connected ? <CheckCircle2 className="h-4 w-4"/> : <CircleDashed className="h-4 w-4"/>}
              {connected ? "Pronto para atender" : "Conexão pendente"}
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {Icon:ShieldCheck,title:"Instância exclusiva",description:"Separada dos outros projetos"},
              {Icon:Wifi,title:"Status em tempo real",description:"Conexão acompanhada no painel"},
              {Icon:Smartphone,title:"Pareamento por QR",description:"Vincule seu aparelho"},
            ].map(({Icon,title,description})=>(
              <div key={title} className="rounded-xl border bg-subtle p-4">
                <Icon className="mb-3 h-5 w-5 text-[#167b60]"/>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-text-3">{description}</p>
              </div>
            ))}
          </div>
        </div>
        {!connected && <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ed] text-[#167b60]"><QrCode className="h-5 w-5"/></span>
            <div><h2 className="text-base font-semibold">Como conectar seu número</h2>
              <p className="mt-1 text-sm text-text-2">O pareamento é feito em um painel separado, protegido por senha.</p></div>
          </div>
          <ol className="mt-5 space-y-3">
            {[
              "Abra o painel de conexão abaixo.",
              "Crie ou inicie a sessão novagente.",
              "No celular, abra WhatsApp > Aparelhos conectados > Conectar aparelho.",
              "Leia o QR Code e volte ao Painel NOVAGENTE.",
            ].map((item,i)=>(
              <li key={i} className="flex items-start gap-3 text-sm text-text-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f4eb] text-xs font-bold text-[#167b60]">{i+1}</span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ol>
          {dashboard && <a className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#12796f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0e655b]" href={dashboard} target="_blank" rel="noopener noreferrer">
            Abrir painel de conexão <ExternalLink className="h-4 w-4"/>
          </a>}
          {!dashboard && <p className="mt-5 text-sm text-warning-text">O endereço do painel de conexão ainda não está configurado.</p>}
        </section>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4">
          <p className="text-xs leading-5 text-text-3">WAHA é uma solução não oficial do WhatsApp. Utilize somente com autorização e considere o risco de restrições de conta.</p>
          <Link href="/inicio" className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-[#12796f]">Visão geral <ArrowRight className="h-3.5 w-3.5"/></Link>
        </div>
      </div>
    </section>
  );
}

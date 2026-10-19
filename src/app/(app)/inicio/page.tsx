import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq, sum } from "drizzle-orm";
import {
  ArrowRight, ArrowUpRight, Bot, CheckCircle2, CircleDashed,
  Headphones, MessageCircleMore, Plus, Send, Sparkles, TrendingUp, Users, Wifi,
} from "lucide-react";
import { getSessionOrNull } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { wahaEnabled } from "@/server/waha/config";
import { wahaSessionStatus } from "@/server/waha/client";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  WORKING: "Conectado", STARTING: "Iniciando", SCAN_QR_CODE: "Aguardando QR Code",
  STOPPED: "Desconectado", FAILED: "Falha na conexão",
  NOT_CREATED: "Aguardando configuração", OFFLINE: "Serviço indisponível",
};

export default async function InicioPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  const id = session.organizationId;
  const db = getDb();

  const [[contacts], [convs], [leads], [unread], [agent], recent] = await Promise.all([
    db.select({total:count()}).from(schema.contact).where(eq(schema.contact.organizationId,id)),
    db.select({total:count()}).from(schema.conversation).where(eq(schema.conversation.organizationId,id)),
    db.select({total:count()}).from(schema.lead).where(eq(schema.lead.organizationId,id)),
    db.select({total:sum(schema.conversation.unreadCount)}).from(schema.conversation)
      .where(eq(schema.conversation.organizationId,id)),
    db.select({enabled:schema.agentProfile.enabled,name:schema.agentProfile.name})
      .from(schema.agentProfile).where(eq(schema.agentProfile.organizationId,id)).limit(1),
    db.select({
      id:schema.conversation.id,
      person:schema.contact.name,
      last:schema.conversation.lastMessageAt,
      unread:schema.conversation.unreadCount,
    })
      .from(schema.conversation)
      .innerJoin(schema.contact,eq(schema.contact.id,schema.conversation.contactId))
      .where(eq(schema.conversation.organizationId,id))
      .orderBy(desc(schema.conversation.lastMessageAt))
      .limit(5),
  ]);
  const totalContacts=contacts?.total ?? 0;
  const totalConversations=convs?.total ?? 0;
  const totalLeads=leads?.total ?? 0;
  const totalUnread=Number(unread?.total ?? 0);
  const enabledAgent=Boolean(agent?.enabled);
  let waha="Não configurado";
  if (wahaEnabled()) {
    try { const status=await wahaSessionStatus(); waha=statusLabel[status] || status; }
    catch { waha="Serviço indisponível"; }
  }
  const whatsappConnected=waha==="Conectado";
  const date=new Intl.DateTimeFormat("pt-BR",{
    weekday:"long",day:"numeric",month:"long",timeZone:"America/Porto_Velho"
  }).format(new Date());

  const stats=[
    {label:"Contatos cadastrados",value:totalContacts,Icon:Users,note:"Pessoas na base",link:"/contacts"},
    {label:"Conversas registradas",value:totalConversations,Icon:MessageCircleMore,note:"Histórico de atendimentos",link:"/inbox"},
    {label:"Oportunidades",value:totalLeads,Icon:TrendingUp,note:"Negócios no funil",link:"/pipeline"},
    {label:"Não lidas",value:totalUnread,Icon:Headphones,note:"Mensagens que pedem atenção",link:"/inbox"},
  ];
  const shortcuts=[
    {label:"Abrir atendimentos",desc:"Responder e acompanhar conversas",Icon:Headphones,href:"/inbox"},
    {label:"Organizar negócios",desc:"Visualizar o funil comercial",Icon:TrendingUp,href:"/pipeline"},
    {label:"Adicionar contatos",desc:"Criar ou importar sua base",Icon:Plus,href:"/contacts"},
    {label:"Configurar IA",desc:"Ajustar como o agente trabalha",Icon:Sparkles,href:"/agent"},
  ];

  return (
    <div className="h-full overflow-y-auto bg-subtle">
      <div className="mx-auto max-w-[1380px] space-y-7 px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#24ad83]"/> CENTRAL DE OPERAÇÕES
            </div>
            <h1 className="text-[27px] font-[780] tracking-[-0.045em] sm:text-[34px]">Visão geral</h1>
            <p className="mt-1 text-[14px] text-text-2">
              Tudo o que importa para acompanhar o seu negócio, em um só lugar.
            </p>
          </div>
          <span className="rounded-full border bg-card px-4 py-2 text-xs font-medium capitalize text-text-2">
            {date}
          </span>
        </header>

        <section className="ng-panel-hero relative overflow-hidden rounded-[26px] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[640px]">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.13em] text-[#c2f0d5]">
                <Sparkles className="h-3.5 w-3.5"/> PAINEL NOVAGENTE
              </span>
              <h2 className="text-[25px] font-[740] leading-tight tracking-[-0.04em] sm:text-[34px]">
                Sua operação mais inteligente. <span className="text-[#b8eacb]">Seu negócio mais leve.</span>
              </h2>
              <p className="mt-3 max-w-[520px] text-sm leading-6 text-[#d2eadc]">
                Centralize atendimentos, acompanhe oportunidades e descubra
                onde a inteligência artificial pode fazer a diferença.
              </p>
            </div>
            <Link href="/inbox" className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#153d32] transition hover:bg-[#d5f2de] lg:self-center">
              Ir para atendimentos <ArrowUpRight className="h-4 w-4"/>
            </Link>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({label,value,Icon,note,link})=>(
            <Link href={link} key={label} className="ng-card group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#9ecbb6]">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ed] text-[#166f57]">
                  <Icon className="h-5 w-5" strokeWidth={1.7}/>
                </span>
                <ArrowUpRight className="h-4 w-4 text-text-3 transition group-hover:text-[#166f57]"/>
              </div>
              <div><p className="text-[30px] font-[770] leading-none tracking-[-0.055em]">{value.toLocaleString("pt-BR")}</p>
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs text-text-3">{note}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.85fr]">
          <section className="ng-card rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><h3 className="text-[17px] font-bold tracking-tight">Acesso rápido</h3>
                <p className="mt-0.5 text-xs text-text-3">O que você precisa fazer agora?</p></div>
              <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">Operação</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map(({label,desc,Icon,href})=>(
                <Link href={href} key={label} className="group flex items-start gap-3 rounded-xl border bg-subtle p-4 transition hover:border-[#9ed7b6] hover:bg-[#eff8f1]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#196a53]"><Icon className="h-[18px] w-[18px]"/></div>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold">{label}</p><p className="mt-1 text-xs leading-5 text-text-3">{desc}</p></div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-3 transition group-hover:translate-x-1"/>
                </Link>
              ))}
            </div>
          </section>
          <section className="ng-card rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><h3 className="text-[17px] font-bold tracking-tight">Status da operação</h3>
                <p className="mt-0.5 text-xs text-text-3">Acompanhe as conexões essenciais</p></div>
              <Wifi className="h-5 w-5 text-text-3"/>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-subtle p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5f4ed] text-[#187451]"><MessageCircleMore className="h-[18px] w-[18px]"/></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">WhatsApp</p><p className="text-xs text-text-3">{waha}</p></div>
                {whatsappConnected?<CheckCircle2 className="h-5 w-5 text-[#25855b]"/>:<CircleDashed className="h-5 w-5 text-[#d49a41]"/>}
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-subtle p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5f4ed] text-[#187451]"><Bot className="h-[18px] w-[18px]"/></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Agente de IA</p><p className="text-xs text-text-3">{enabledAgent ? "Ativado no painel" : "Desativado"}</p></div>
                {enabledAgent?<CheckCircle2 className="h-5 w-5 text-[#25855b]"/>:<CircleDashed className="h-5 w-5 text-[#d49a41]"/>}
              </div>
            </div>
            <Link href="/settings/whatsapp" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#15785f] hover:underline">
              Configurar WhatsApp <ArrowRight className="h-3.5 w-3.5"/>
            </Link>
          </section>
        </div>

        <section className="ng-card rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="text-[17px] font-bold tracking-tight">Conversas recentes</h3>
              <p className="mt-0.5 text-xs text-text-3">Últimas movimentações registradas</p></div>
            <Link className="text-xs font-bold text-[#15785f] hover:underline" href="/inbox">Ver todos <ArrowRight className="inline h-3.5 w-3.5"/></Link>
          </div>
          {recent.length===0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-subtle px-4 py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ed] text-[#15785f]"><Send className="h-5 w-5"/></span>
              <p className="text-sm font-semibold">O primeiro atendimento começa aqui.</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-text-3">Quando as conversas chegarem pelo WhatsApp, você poderá acompanhá-las neste painel.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((conversation)=>(
                <Link href="/inbox" key={conversation.id} className="flex items-center gap-4 py-3 hover:bg-subtle">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f4ed] text-sm font-semibold text-[#176b51]">
                    {conversation.person.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{conversation.person}</p>
                    <p className="text-xs text-text-3">{conversation.last ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Porto_Velho"}).format(conversation.last) : "Sem movimentação"}</p></div>
                  {(conversation.unread ?? 0)>0 && <span className="rounded-full bg-[#e6f4ed] px-2.5 py-1 text-xs font-bold text-[#176b51]">{conversation.unread} novas</span>}
                  <ArrowRight className="h-4 w-4 text-text-3"/>
                </Link>
              ))}
            </div>
          )}
        </section>
        <p className="pb-5 text-center text-[11px] text-text-3">PAINEL NOVAGENTE · Inteligência aplicada à operação</p>
      </div>
    </div>
  );
}

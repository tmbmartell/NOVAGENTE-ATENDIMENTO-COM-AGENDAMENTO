"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Cable,
  Check,
  ChevronRight,
  Sparkles,
  Trash2,
  UserRound,
  Trophy,
  Pencil,
} from "lucide-react";
import {
  externalAnswerLabel,
  externalAnswering,
  externalDown,
  type BrainStatusDto,
} from "@/lib/brain-status";
import type {
  AnuncioDto,
  ConversationDto,
  FichaDto,
  FichaValue,
  StageDto,
} from "@/lib/types";
import { cn, formatPhone } from "@/lib/utils";
import { AnuncioOrigen } from "@/components/anuncio-origen";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FichaPanel } from "@/components/ficha-panel";
import { DeleteConversationDialog } from "./delete-conversation-dialog";
import { ContactHistory } from "./contact-history";
import { ScheduleFromChat } from "./schedule-from-chat";

const HANDOFF_LABELS: Record<string, string> = {
  cliente: "El cliente pidió un humano",
  modelo: "El agente decidió escalar",
  error: "Error del proveedor de IA",
  ventana: "Ventana de 24h cerrada",
  manual_reply: "Respondiste desde el teléfono — IA en pausa",
};

export function ContactPanel({
  conversation,
  refreshKey = 0,
  onPatchConversation,
  onDeleteConversation,
  onClose,
}: {
  conversation: ConversationDto;
  /** Aumenta con cada evento SSE relevante: dispara un refetch en vivo. */
  refreshKey?: number;
  onPatchConversation: (patch: {
    aiEnabled?: boolean;
    reactivate?: boolean;
  }) => Promise<void>;
  /** 026 — Ausente = quien mira no puede eliminar: no se le ofrece. */
  onDeleteConversation?: (alsoContact: boolean) => Promise<string | null>;
  onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(conversation.contact.name);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [stageError, setStageError] = useState("");
  const [lossDialog, setLossDialog] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("nunca_contesto");
  const [ficha, setFicha] = useState<FichaDto>({});
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [stages, setStages] = useState<StageDto[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  // 018: de qué anuncio llegó; null si escribió por su cuenta.
  const [anuncio, setAnuncio] = useState<AnuncioDto | null>(null);
  // Quién responde (agente incluido, cerebro externo o los dos): sin esto, el
  // toggle "Respondiendo" mentiría cuando el agente aún no se ha
  // configurado/encendido, y pediría la clave de IA aunque conteste Nea.
  const [brain, setBrain] = useState<BrainStatusDto | null>(null);

  const contactId = conversation.contact.id;

  const aiConfigured = brain?.embedded.configured ?? false;
  const agentReady = brain?.embedded.answering ?? false;
  // Hasta donde se sabe, contesta: activo y, si hay /health, en línea.
  const externalActive = brain ? externalAnswering(brain) : false;
  // El control es la FUENTE DE VERDAD de la conversación: el agente in-process
  // y cualquier cerebro externo conectado por /api/bot/* respetan este flag,
  // así que el toggle opera siempre — `agentReady` solo matiza el texto.
  const aiActive = conversation.aiEnabled && !conversation.handoffAt;

  // Aparte del resto: consultar el /health del cerebro externo puede tardar
  // hasta 2 s, y eso no debe demorar la etapa ni la ficha.
  const loadBrain = useCallback(async () => {
    const b = await fetch("/api/agent/brain-status")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (b) setBrain(b);
  }, []);

  // Carga inicial (incluye notas): se re-ejecuta al cambiar de contacto.
  const refetch = useCallback(async () => {
    void loadBrain();
    const [detail, stagesRes] = await Promise.all([
      fetch(`/api/contacts/${contactId}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pipeline/stages").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null]);
    if (detail) {
      setNotes(detail.contact?.notes ?? "");
      setName(detail.contact?.name ?? conversation.contact.name);
      setEditingName(false);
      setFicha(detail.contact?.ficha ?? {});
      setCurrentStageId(detail.stage?.id ?? null);
      setLeadId(detail.lead?.id ?? null);
      setAnuncio(detail.anuncio ?? null);
    }
    if (stagesRes) setStages(stagesRes.stages);
    setNotesLoaded(true);
  }, [contactId, loadBrain, conversation.contact.name]);

  // Refetch en vivo (etapa/lead + quién responde) SIN tocar las notas, para
  // no pisar lo que el operador esté escribiendo. Lo dispara el SSE.
  const refreshLive = useCallback(async () => {
    void loadBrain();
    const detail = await fetch(`/api/contacts/${contactId}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (detail) {
      // La ficha SÍ se refresca en vivo: el agente la va llenando mientras la
      // conversación ocurre, y verla aparecer sola es justo para lo que sirve.
      // No pisa una edición a medias — el borrador vive dentro del panel.
      setFicha(detail.contact?.ficha ?? {});
      setCurrentStageId(detail.stage?.id ?? null);
      setLeadId(detail.lead?.id ?? null);
      // La imagen del creativo se copia después de que entra el mensaje: este
      // refetch en vivo es lo que la hace aparecer sin recargar.
      setAnuncio(detail.anuncio ?? null);
    }
  }, [contactId, loadBrain]);

  useEffect(() => {
    setNotesLoaded(false);
    // Al cambiar de contacto no puede asomarse el anuncio del anterior.
    setAnuncio(null);
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!notesLoaded) return; // la carga inicial ya trae el estado fresco
    void refreshLive();
  }, [refreshKey, notesLoaded, refreshLive]);

  async function moveToStage(stageId: string, reason?: string) {
    if (!leadId || stageId === currentStageId) return;
    const previousStage = currentStageId;
    setStageError("");
    setCurrentStageId(stageId);
    const result=await fetch("/api/pipeline/leads/" + leadId, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, position: 0, ...(reason?{lossReason:reason}:{}) }),
    }).catch(() => null);
    if (!result?.ok) {
      setCurrentStageId(previousStage);
      const data=await result?.json().catch(()=>null) as { error?: { message: string } } | null;
      setStageError(data?.error?.message??"Não foi possível atualizar a fase.");
      return;
    }
    setLossDialog(null);
    void refreshLive();
  }

  async function saveName() {
    const next=name.trim();
    if (!next || next.length>120) return;
    setSavingName(true);setStageError("");
    const res=await fetch("/api/contacts/" + contactId, {
      method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({name:next}),
    }).catch(()=>null);
    setSavingName(false);
    if (!res?.ok) {setStageError("Não foi possível salvar o nome.");return;}
    setEditingName(false);
    void refreshLive();
  }

  function chooseStage(stageId: string) {
    const target=stages.find(s=>s.id===stageId);
    if (target?.kind==="lost") {setLossDialog(stageId);return;}
    void moveToStage(stageId);
  }

  /** Manda SOLO lo que cambió: el servidor hace merge (ver `server/bot/ficha`). */
  async function saveFicha(patch: Record<string, FichaValue | null>) {
    setFicha((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      return next; // optimista: el refetch de abajo confirma
    });
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ficha: patch }),
    }).catch(() => null);
    void refreshLive();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => null);
    setSavingNotes(false);
  }

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  return (
    <div className="flex h-full flex-col">
      {/* Por debajo de xl el panel flota (bg-popover, ver InboxClient): su
          cabecera va del mismo tono para no dejar una franja más oscura. */}
      <header className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3 max-xl:bg-popover">
        <h3 className="kicker text-text-2">Detalles</h3>
        <button
          onClick={onClose}
          aria-label="Ocultar panel"
          className="rounded p-1 text-text-3 hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Contacto */}
        <section className="border-b p-4">
          <div className="flex items-center gap-3">
            <ContactAvatar
              name={conversation.contact.name}
              seed={conversation.contact.id}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight">
                {conversation.contact.name}
              </p>
              <p className="text-xs text-text-3">
                {formatPhone(conversation.contact.phone)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border bg-subtle p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Nome do contato</span>
              <button type="button" className="flex items-center gap-1 text-xs text-brand-text underline"
                onClick={()=>setEditingName(v=>!v)}><Pencil className="h-3.5 w-3.5"/> {editingName?"Cancelar":"Editar nome"}</button>
            </div>
            {editingName ? <div className="mt-2 flex gap-2">
              <input className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-xs" value={name} maxLength={120}
                onChange={e=>setName(e.target.value)} placeholder="Nome que a equipe reconhecerá"/>
              <Button size="sm" disabled={savingName || !name.trim()} onClick={()=>void saveName()}>{savingName?"Salvando…":"Salvar"}</Button>
            </div> : <p className="mt-1 text-xs text-text-2">{name}</p>}
          </div>

          {conversation.handoffAt && (
            <div className="mt-3 rounded-md border border-warning-soft bg-warning-tint p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning-text">
                <UserRound className="h-4 w-4" strokeWidth={1.7} /> Atención humana
              </p>
              <p className="mt-1 text-xs text-warning-text opacity-80">
                {HANDOFF_LABELS[conversation.handoffReason ?? ""] ??
                  "La IA está en pausa en esta conversación."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => void onPatchConversation({ reactivate: true })}
              >
                Reactivar IA
              </Button>
            </div>
          )}

          <div className="mt-3 rounded-md border bg-subtle px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium">IA en esta conversación</p>
                <p className="text-[11px] text-text-3">
                  {conversation.handoffAt
                    ? "En pausa · atención humana"
                    : !conversation.aiEnabled
                      ? "En pausa"
                      : agentReady || externalActive
                        ? "Respondiendo"
                        : "Activada"}
                </p>
              </div>
              <Switch
                size="sm"
                checked={aiActive}
                label="IA en esta conversación"
                onCheckedChange={() => {
                  void onPatchConversation({
                    aiEnabled: !conversation.aiEnabled,
                  });
                }}
              />
            </div>

            {brain?.warning === "doble_respuesta" ? (
              <div className="mt-2.5 flex items-start gap-2 rounded-md border border-danger-soft bg-danger-tint p-2.5">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-text"
                  strokeWidth={1.7}
                />
                <div className="text-[11px] leading-relaxed text-danger-text">
                  <p>
                    <span className="font-semibold">Doble respuesta:</span> el agente
                    incluido y tu cerebro externo contestan a la vez.
                  </p>
                  <Link
                    href="/agent"
                    className="mt-1 inline-block font-medium underline underline-offset-2"
                  >
                    Revisar en Agente →
                  </Link>
                </div>
              </div>
            ) : brain && !agentReady && externalActive ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-3">
                <Cable className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                {externalAnswerLabel(brain)}
              </p>
            ) : brain && !agentReady && externalDown(brain) ? (
              <div className="mt-2.5 flex items-start gap-2 rounded-md border border-warning-soft bg-warning-tint p-2.5">
                <Cable
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-text"
                  strokeWidth={1.7}
                />
                <p className="text-[11px] leading-relaxed text-warning-text">
                  Tu cerebro externo no está en línea: nadie contesta en automático
                  hasta que vuelva.
                  <Link
                    href="/agent"
                    className="ml-1 whitespace-nowrap font-medium text-brand-text underline underline-offset-2 hover:text-brand"
                  >
                    Ver agente →
                  </Link>
                </p>
              </div>
            ) : brain && !agentReady && (
              <div className="mt-2.5 flex items-start gap-2 rounded-md border border-warning-soft bg-warning-tint p-2.5">
                <Sparkles
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-text"
                  strokeWidth={1.7}
                />
                <p className="text-[11px] leading-relaxed text-warning-text">
                  {aiConfigured
                    ? "O agente do Painel NOVAGENTE não está respondendo. Configure a IA e ative o atendimento automático ou conecte outro agente autorizado."
                    : "Falta el proveedor de IA (o está pausado) para que el agente responda, o conecta tu propio bot por la API."}
                  <Link
                    href={aiConfigured ? "/agent" : "/settings/ai"}
                    className="ml-1 whitespace-nowrap font-medium text-brand-text underline underline-offset-2 hover:text-brand"
                  >
                    {aiConfigured ? "Configurar agente →" : "Configurar IA →"}
                  </Link>
                </p>
              </div>
            )}
          </div>

          {anuncio && (
            <div className="mt-3">
              <AnuncioOrigen anuncio={anuncio} />
            </div>
          )}
        </section>

        {/* Stepper de etapa */}
        {stages.length > 0 && leadId && (
          <section className="border-b p-4">
            <p className="kicker mb-3">Fase do atendimento</p>
            <p className="mb-3 text-xs text-text-3">O cliente permanece na mesma fase quando envia novas mensagens. A equipe decide quando avançar.</p>
            {stageError && <p role="alert" className="mb-2 text-xs text-danger-text">{stageError}</p>}
            <ol>
              {stages.map((s, i) => {
                const done = currentIndex >= 0 && i < currentIndex;
                const current = s.id === currentStageId;
                return (
                  <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < stages.length - 1 && (
                      <span
                        className={cn(
                          "absolute left-[7px] top-4 h-full w-px",
                          done ? "bg-brand" : "bg-border-strong"
                        )}
                      />
                    )}
                    <button
                      onClick={() => chooseStage(s.id)}
                      aria-label={`Mover a ${s.name}`}
                      className={cn(
                        "relative z-10 mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full transition-colors",
                        done && "bg-brand text-brand-fg",
                        current && "bg-brand ring-4 ring-brand-soft",
                        !done && !current && "border border-border-strong bg-background hover:border-brand"
                      )}
                    >
                      {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </button>
                    <button
                      onClick={() => chooseStage(s.id)}
                      className={cn(
                        "text-left text-[13px]",
                        current ? "font-[650] text-brand-text" : "text-text-2 hover:text-foreground"
                      )}
                    >
                      {s.kind === "won" ? "🏆 Cliente conquistado" : s.name}
                      {s.kind === "won" && <Trophy className="ml-1 inline h-3.5 w-3.5 text-success-text"/>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Ficha: lo que se SABE del lead. Va antes de Notas —lo que alguien
            OPINA— porque es lo que se consulta a mitad de una conversación. */}
        <FichaPanel ficha={ficha} onSave={saveFicha} />

        {/* Notas */}
        <section className={cn("p-4", onDeleteConversation && "border-b")}>
          <p className="kicker mb-2">Resumo atual para o próximo atendente</p>
          <p className="mb-2 text-xs text-text-3">O que a equipe precisa saber para continuar a conversa sem repetir perguntas?</p>
          <Textarea
            rows={5}
            placeholder="Necessidade, serviço desejado, próximos passos…"
            value={notes}
            disabled={!notesLoaded}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            disabled={savingNotes || !notesLoaded}
            onClick={() => void saveNotes()}
          >
            {savingNotes ? "Guardando…" : "Guardar notas"}
          </Button>
        </section>

        <ContactHistory contactId={contactId} />
        <ScheduleFromChat contactId={contactId} conversationId={conversation.id} />
        {/* 026 — Al fondo y sin color de alarma: está a la mano de quien la
            busca, no en el camino de quien solo vino a leer la ficha. */}
        {onDeleteConversation && (
          <section className="p-4">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 rounded text-[13px] text-text-3 transition-colors hover:text-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
              Excluir conversa…
            </button>
          </section>
        )}
      </div>

      {lossDialog && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-overlay p-4" role="dialog" aria-modal="true" aria-label="Registrar cliente perdido">
          <div className="w-full max-w-sm rounded-2xl border bg-popover p-5 shadow-pop">
            <h3 className="text-base font-bold">Marcar como perdido</h3>
            <p className="my-3 text-sm text-text-2">Registre o motivo para que a equipe conheça o contexto. O histórico será preservado.</p>
            <select value={lossReason} onChange={e=>setLossReason(e.target.value)}
              className="w-full rounded-lg border bg-background p-2 text-sm">
              <option value="nunca_contesto">Parou de responder</option>
              <option value="precio">Preço</option>
              <option value="sin_presupuesto">Sem orçamento</option>
              <option value="no_es_perfil">Fora do perfil</option>
              <option value="eligio_otro">Escolheu outro fornecedor</option>
              <option value="otro">Outro motivo</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={()=>setLossDialog(null)}>Cancelar</Button>
              <Button size="sm" onClick={()=>void moveToStage(lossDialog,lossReason)}>Confirmar perda</Button>
            </div>
          </div>
        </div>
      )}
      {confirmingDelete && onDeleteConversation && (
        <DeleteConversationDialog
          contactName={conversation.contact.name}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDeleteConversation}
        />
      )}
    </div>
  );
}

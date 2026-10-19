"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  BotOff,
  MessageSquareText,
  Search,
  Send,
  Upload,
  UserPlus,
  Users,
  Columns3,
  List,
} from "lucide-react";
import type { ContactDto } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SOURCE_LABELS } from "@/server/contact-source";
import { priorityRank } from "@/server/leads/priority";
import { PriorityBadge } from "@/components/pipeline/priority-picker";
import { ImportContactsDialog } from "./import-contacts-dialog";
import { NewContactDialog } from "./new-contact-dialog";
import { StartConversation } from "./start-conversation";

export function ContactsClient() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [view, setView] = useState<"funil"|"lista">("funil");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [stages, setStages] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ContactDto | null>(null);
  const [creando, setCreando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [escribiendo, setEscribiendo] = useState<ContactDto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mismo rescate que en la Bandeja: lo tecleado antes de que hidrate el JS
  // se perdía en silencio. Ver conversation-list.tsx.
  useEffect(() => {
    const typed = inputRef.current?.value ?? "";
    if (typed) setQuery(typed);
  }, []);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/pipeline/stages").catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { stages: { name: string }[] };
      setStages(data.stages.map((s) => s.name));
    })();
  }, []);

  const refetch = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stage !== "all") params.set("stage", stage);
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/contacts?${params}`).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { contacts: ContactDto[] };
    // A quién llamar primero: alta arriba, sin prioridad al final. El orden lo
    // decide esta lista, no el servidor, porque es una preferencia de trabajo y
    // no un dato del contacto.
    setContacts(
      [...data.contacts].sort(
        (a, b) => priorityRank(a.priority ?? null) - priorityRank(b.priority ?? null)
      )
    );
  }, [query, stage, showArchived]);

  useEffect(() => {
    const t = setTimeout(() => void refetch(), 250);
    return () => clearTimeout(t);
  }, [refetch]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    void refetch();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-bold tracking-tight">Contatos</h2>
          <Button size="sm" onClick={() => setCreando(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
            Novo contato
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setImportando(true)}>
            <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
            Importar
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1" aria-label="Visualização dos contatos">
          <button type="button" onClick={()=>setView("funil")} aria-pressed={view==="funil"}
            className={"flex items-center gap-1 rounded-md px-2 py-1.5 text-xs " + (view==="funil"?"bg-brand text-brand-fg":"hover:bg-accent")}>
            <Columns3 className="h-4 w-4"/> Funil
          </button>
          <button type="button" onClick={()=>setView("lista")} aria-pressed={view==="lista"}
            className={"flex items-center gap-1 rounded-md px-2 py-1.5 text-xs " + (view==="lista"?"bg-brand text-brand-fg":"hover:bg-accent")}>
            <List className="h-4 w-4"/> Lista
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-primary"
            />
            Ver arquivados
          </label>
          {stages.length > 0 && (
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              aria-label="Filtrar por etapa do funil"
              className="h-9 rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="all">Todas as etapas</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar por nome ou telefone…"
              aria-label="Buscar contato"
              defaultValue=""
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 sm:w-72"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {contacts.length === 0 ? (
          query.trim() || stage !== "all" ? (
            <EmptyState
              icon={Search}
              className="h-full"
              title="Nenhum resultado"
              description={
                <>
                  Nenhum contato corresponde a
                  {query.trim() ? ` «${query.trim()}»` : ""}
                  {query.trim() && stage !== "all" ? " en" : ""}
                  {stage !== "all" ? ` la etapa «${stage}»` : ""}.
                </>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              className="h-full"
              title="Nenhum contato"
              description="Quem conversar com seu WhatsApp será cadastrado automaticamente aqui."
            />
          )
        ) : view === "funil" ? (
          <div className="flex min-h-0 gap-3 overflow-x-auto pb-4">
            {[
              {name:"Novo contato", label:"Novo contato"},
              {name:"Em atendimento",label:"Em atendimento"},
              {name:"Qualificado",label:"Qualificado / negociação"},
              {name:"Cliente",label:"🏆 Clientes conquistados"},
              {name:"Perdido",label:"Perdidos"},
              {name:"__outras__",label:"Outras fases"},
            ].map(({name,label}) => {
              const canonical=new Set(["Novo contato","Em atendimento","Qualificado","Cliente","Perdido"]);
              const group=contacts.filter(c => name==="__outras__"
                ? !!c.stageName && !canonical.has(c.stageName)
                : (c.stageName??"Novo contato")===name);
              return <section key={name} className="w-[255px] min-w-[255px] self-start rounded-2xl border bg-subtle p-3">
                <header className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{label}</h3>
                  <span className="rounded-full bg-card px-2 py-1 text-xs font-semibold">{group.length}</span>
                </header>
                <div className="space-y-2">
                  {group.length===0 && <p className="rounded-xl bg-card p-3 text-xs text-text-3">Nenhum contato nesta fase.</p>}
                  {group.map(c=><Link key={c.id} href={"/inbox?contact="+c.id}
                    className="block rounded-xl border bg-card p-3 transition hover:border-brand" title="Abrir atendimento">
                    <div className="flex items-center gap-2">
                      <ContactAvatar name={c.name} seed={c.id}/>
                      <span className="min-w-0 truncate text-sm font-semibold">{c.name}</span>
                    </div>
                    <p className="mt-2 text-xs text-text-3">{formatPhone(c.phone)}</p>
                    {c.notes && <p className="mt-2 line-clamp-3 text-xs leading-5 text-text-2">{c.notes}</p>}
                  </Link>)}
                </div>
              </section>;
            })}
          </div>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-3 sm:flex-nowrap sm:gap-x-4 sm:px-4"
              >
                <ContactAvatar name={c.name} seed={c.id} />
                {/* El 60% mínimo es lo que empuja los botones a su propio
                    renglón en el teléfono en vez de exprimir el nombre. */}
                <div className="min-w-[60%] flex-1 sm:min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {c.name}
                    </span>
                    {c.priority && <PriorityBadge value={c.priority} />}
                    {c.stageName && (
                      <Badge variant="outline">{c.stageName}</Badge>
                    )}
                    {c.archivedAt && (
                      <Badge variant="secondary">Arquivado</Badge>
                    )}
                    {c.aiPaused && (
                      <Badge
                        variant="warning"
                        title="O agente não responde a este contato: você assume o atendimento"
                      >
                        <BotOff className="mr-1 h-3 w-3" strokeWidth={1.8} />
                        Sem agente
                      </Badge>
                    )}
                    {/* Solo la fuente que alguien capturó: presentar una
                        deducción como dato la volvería un número inventado en
                        cuanto se cuente por fuente. */}
                    {c.source?.source === "capturada" && (
                      <Badge variant="secondary">
                        {SOURCE_LABELS[c.source.value]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPhone(c.phone)}
                    {c.notes ? ` · ${c.notes.slice(0, 60)}` : ""}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(c)}
                  >
                    Editar
                  </Button>
                  {/* A quien nunca escribió hay que abrirle la conversación con
                      una plantilla: es regla de Meta, no del CRM. */}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Escribir primero"
                    title="Escribir primero (con plantilla)"
                    onClick={() => setEscribiendo(c)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Link href={`/inbox?contact=${c.id}`}>
                    <Button variant="ghost" size="icon" aria-label="Abrir conversación">
                      <MessageSquareText className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={c.archivedAt ? "Desarchivar" : "Archivar"}
                    onClick={() => void patch(c.id, { archived: !c.archivedAt })}
                  >
                    {c.archivedAt ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditDialog
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={async (patchBody) => {
            await patch(editing.id, patchBody);
            setEditing(null);
          }}
        />
      )}

      {escribiendo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Escribir primero"
        >
          <div className="w-full max-w-md rounded-lg border bg-popover p-4 shadow-pop">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                Escribir a {escribiendo.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEscribiendo(null)}>
                Cerrar
              </Button>
            </div>
            <StartConversation
              contactId={escribiendo.id}
              onStarted={() => {
                const contactId = escribiendo.id;
                setEscribiendo(null);
                // La Bandeja resuelve por CONTACTO (`?contact=`), no por
                // conversación: con `?conversation=` no seleccionaría nada.
                router.push(`/inbox?contact=${contactId}`);
              }}
            />
          </div>
        </div>
      )}

      {importando && (
        <ImportContactsDialog
          onClose={() => setImportando(false)}
          onImported={() => void refetch()}
        />
      )}

      {creando && (
        <NewContactDialog
          onClose={() => setCreando(false)}
          onCreated={() => {
            setCreando(false);
            void refetch();
          }}
          onOpenExisting={(contactId) => {
            setCreando(false);
            router.push(`/inbox?contact=${contactId}`);
          }}
        />
      )}
    </div>
  );
}

function EditDialog({
  contact,
  onClose,
  onSave,
}: {
  contact: ContactDto;
  onClose: () => void;
  onSave: (patch: { name: string; notes: string; aiPaused?: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(contact.name);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [aiPaused, setAiPaused] = useState(contact.aiPaused ?? false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-popover p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-semibold">Editar contacto</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-name">
              Nombre
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-notes">
              Notas
            </label>
            <Textarea
              id="edit-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {/* 027 */}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiPaused}
              onChange={(e) => setAiPaused(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>
              El agente no le responde
              <span className="block text-[11px] text-text-3">
                Sus mensajes llegan a la Bandeja y los atiendes tú.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              void onSave({
                name: name.trim(),
                notes,
                // Solo si cambió: mandarlo siempre reescribiría el interruptor
                // de la Bandeja cada vez que alguien corrige un nombre.
                ...(aiPaused !== (contact.aiPaused ?? false) ? { aiPaused } : {}),
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type Slot = { startUtc: string; label: string };
export function ScheduleFromChat({ contactId, conversationId }: { contactId: string; conversationId: string }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(() => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [purpose, setPurpose] = useState<"reuniao"|"retorno"|"presencial">("reuniao");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; meetingLink: string | null; linkPending: boolean } | null>(null);

  const fetchSlots = useCallback(async () => {
    setError(""); setSelected("");
    const res = await fetch("/api/bookings/available?day=" + encodeURIComponent(day), { cache: "no-store" }).catch(() => null);
    const body = res ? await res.json().catch(() => null) as { slots?: Slot[]; error?: { message: string } } | null : null;
    if (!res?.ok || !body?.slots) { setSlots([]); setError(body?.error?.message ?? "Agenda indisponível. Confira as configurações."); return; }
    setSlots(body.slots);
  }, [day]);

  useEffect(() => { if (open) void fetchSlots(); }, [open, fetchSlots]);

  async function submit() {
    if (!selected) return;
    setBusy(true); setError(""); setDone(null);
    const kindNote = purpose === "retorno" ? "Retorno de contato" : purpose === "presencial" ? "Atendimento presencial" : "Reunião";
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "session", contactId, conversationId, startUtc: selected, notes: [kindNote,notes.trim()].filter(Boolean).join(" — ") }),
      });
      const data = await res.json() as {
        booking?: { id: string }; meetingLink?: string | null; linkPending?: boolean;
        error?: { message: string };
      };
      if (!res.ok || !data.booking) { setError(data.error?.message ?? "Não foi possível marcar o horário."); void fetchSlots(); return; }
      setDone({ id: data.booking.id, meetingLink: data.meetingLink ?? null, linkPending: !!data.linkPending });
      setSelected("");
    } catch { setError("Sem conexão. Tente novamente."); }
    finally { setBusy(false); }
  }

  return (
    <section className="border-b p-4">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-brand bg-brand-veil p-3 text-left text-sm font-semibold">
        <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4"/> Agendar para este cliente</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-3 space-y-3 rounded-xl border bg-card p-3">
        <label className="block text-xs font-semibold">Tipo de compromisso
          <select value={purpose} onChange={e=>setPurpose(e.target.value as typeof purpose)} className="mt-1 h-9 w-full rounded-lg border bg-background px-2">
            <option value="reuniao">Reunião (Meet quando conectado)</option>
            <option value="retorno">Retorno de contato</option>
            <option value="presencial">Atendimento presencial</option>
          </select>
        </label>
        <label className="block text-xs font-semibold">Dia
          <input type="date" value={day} onChange={e=>setDay(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border bg-background px-2"/>
        </label>
        <label className="block text-xs font-semibold">Horários livres
          <select value={selected} onChange={e=>setSelected(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-xs">
            <option value="">{slots.length ? "Selecione um horário" : "Nenhum horário livre"}</option>
            {slots.map(slot=><option key={slot.startUtc} value={slot.startUtc}>{slot.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold">Motivo e orientações
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
            placeholder="Ex.: simulação de valores, apresentar proposta…" maxLength={1500}
            className="mt-1 w-full resize-y rounded-lg border bg-background p-2 text-xs"/>
        </label>
        <Button size="sm" className="w-full" disabled={busy||!selected} onClick={()=>void submit()}>
          {busy?"Salvando compromisso…":"Confirmar agendamento"}
        </Button>
        {error && <p role="alert" className="text-xs text-danger-text">{error}</p>}
        {done && <div className="space-y-2 rounded-xl bg-subtle p-3 text-xs">
          <p className="font-semibold text-success-text">Compromisso salvo no calendário.</p>
          {done.meetingLink ? <a className="flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={done.meetingLink}><Video className="h-3 w-3"/> Abrir link de reunião</a>
            : <p>{done.linkPending ? "Link externo pendente: verifique a integração Google." : "Sem link Meet nesta configuração de agenda."}</p>}
          <Link href="/bookings" className="font-semibold underline">Ver calendário e Memória Inteligente →</Link>
        </div>}
      </div>}
    </section>
  );
}

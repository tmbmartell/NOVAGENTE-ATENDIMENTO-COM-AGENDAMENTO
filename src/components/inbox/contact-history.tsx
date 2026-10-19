"use client";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ServiceNote = { id: string; category: string; body: string; author: string | null; createdAt: string };
const CATEGORY = {
  geral: "Registro geral", simulacao: "Simulação de preço", orcamento: "Orçamento / proposta",
  necessidade: "Necessidade do cliente", duvida: "Dúvida", retorno: "Retorno combinado",
} as const;

export function ContactHistory({ contactId }: { contactId: string }) {
  const [notes, setNotes] = useState<ServiceNote[]>([]);
  const [category, setCategory] = useState<keyof typeof CATEGORY>("geral");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const res = await fetch("/api/contacts/" + contactId + "/service-notes", { cache: "no-store" }).catch(()=>null);
    if (!res?.ok) { setError("Não foi possível buscar os registros."); setLoading(false); return; }
    setNotes(((await res.json()) as { notes: ServiceNote[] }).notes);
    setLoading(false);
  }, [contactId]);
  useEffect(() => { setLoading(true);setNotes([]);setError("");setBody("");void refresh(); }, [refresh]);
  async function save() {
    if (body.trim().length < 4) return;
    setSaving(true);setError("");
    try {
      const res=await fetch("/api/contacts/" + contactId + "/service-notes", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({body:body.trim(),category})
      });
      if (!res.ok) throw new Error("Falha ao registrar. Tente novamente.");
      setBody("");await refresh();
    } catch (e) {setError(e instanceof Error?e.message:"Falha ao registrar");}
    finally {setSaving(false);}
  }
  return <section className="border-b p-4">
    <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4"/> Histórico interno do atendimento</h4>
    <p className="mb-3 text-xs text-text-3">Registros de contexto da equipe, separados das mensagens do WhatsApp. Cada anotação fica com data e responsável.</p>
    <label className="block text-xs font-semibold">Assunto do registro
      <select value={category} onChange={e=>setCategory(e.target.value as keyof typeof CATEGORY)}
        className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-xs">
        {Object.entries(CATEGORY).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <textarea rows={3} className="mt-2 w-full resize-y rounded-xl border bg-background p-2 text-xs"
      placeholder="Ex.: pediu simulação de valores. Próximo passo: enviar proposta."
      value={body} maxLength={2500} onChange={e=>setBody(e.target.value)}/>
    <Button size="sm" variant="secondary" className="mt-1 w-full" disabled={saving||body.trim().length<4} onClick={()=>void save()}>
      <Plus className="mr-1.5 h-3.5 w-3.5"/>{saving?"Salvando…":"Adicionar ao histórico"}
    </Button>
    {error && <p role="alert" className="mt-2 text-xs text-danger-text">{error}</p>}
    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
      {loading && <p className="text-xs text-text-3">Carregando histórico…</p>}
      {!loading && notes.length===0 && <p className="rounded-lg bg-subtle p-3 text-xs text-text-3">Ainda não há registros internos. As mensagens continuam no histórico do chat.</p>}
      {notes.map(n=><article key={n.id} className="rounded-xl border bg-card p-3">
        <p className="text-[11px] font-bold text-brand-text">{CATEGORY[n.category as keyof typeof CATEGORY]??n.category}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{n.body}</p>
        <p className="mt-2 text-[10px] text-text-3">{n.author??"Equipe"} · {new Date(n.createdAt).toLocaleString("pt-BR",{timeZone:"America/Porto_Velho"})}</p>
      </article>)}
    </div>
  </section>;
}

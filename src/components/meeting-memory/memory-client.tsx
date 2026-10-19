"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck2, CheckCircle2, Clock3, FileAudio2, ListChecks, Mic2, MonitorUp, PlayCircle, Sparkles, Square, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Suggestion = { description: string; evidence: string; source: "explicit" | "suggestion"; dueDate: string | null };
type Analysis = {
  summary: string; category: string; tags: string[];
  decisions: string[]; objections: string[];
  suggestedTasks: Suggestion[]; method: "ai" | "local_rules";
};
type RecordItem = {
  id: string; title: string; category: string; status: string;
  bookingId: string | null; transcript: string | null; summary: string | null;
  analysis: Analysis | null; errorReason: string | null; createdAt: string;
};
type BookingItem = { id: string; kind: string; date: string; time: string; contact: { name: string } | null; status: string };
type Task = { id: string; description: string; status: string; source: string; evidence: string | null; dueAt: string | null };

const categories = [{ value: "reuniao", label: "Reunião" }, { value: "atendimento", label: "Atendimento" },
  { value: "venda", label: "Venda" }, { value: "outro", label: "Outro" }];
function formatted(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Porto_Velho" }).format(new Date(date));
}

export function MemoryClient() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("reuniao");
  const [bookingId, setBookingId] = useState("");
  const [consent, setConsent] = useState(false);
  const [allowExternalAi, setAllowExternalAi] = useState(false);
  const [mode, setMode] = useState<"microphone" | "tab">("microphone");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [draftTranscript, setDraftTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeStreams = useRef<MediaStream[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const started = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/meeting-memory", { cache: "no-store" });
    if (!res.ok) { setError("Não foi possível carregar a memória das reuniões."); return; }
    const body = await res.json() as { recordings: RecordItem[] };
    setRecords(body.recordings);
  }, []);
  const refreshTasks = useCallback(async (id: string) => {
    const res = await fetch("/api/meeting-memory/" + id + "/tasks");
    if (res.ok) setTasks(((await res.json()) as { tasks: Task[] }).tasks);
  }, []);
  useEffect(() => {
    void refresh();
    void fetch("/api/bookings").then(async (r) => {
      if (r.ok) setBookings(((await r.json()) as { bookings: BookingItem[] }).bookings.filter(b => b.kind === "session" && b.status !== "cancelada"));
    }).catch(() => {});
  }, [refresh]);
  useEffect(() => {
    const item = records.find(r => r.id === selected);
    setDraftTranscript(item?.transcript ?? "");
    if (selected) void refreshTasks(selected);
    else setTasks([]);
  }, [selected, records, refreshTasks]);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    try { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); } catch {}
    activeStreams.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    void audioContext.current?.close();
  }, []);

  const current = records.find(r => r.id === selected) ?? null;
  async function uploadAudio(audio: Blob, suppliedName?: string) {
    setBusy(true); setError(""); setNote("");
    try {
      const mime = audio.type.split(";")[0];
      const ext = mime === "audio/ogg" ? "ogg" : mime === "audio/mp4" ? "mp4" : mime === "audio/wav" ? "wav" : mime === "audio/mpeg" ? "mp3" : "webm";
      const form = new FormData();
      form.append("audio", audio, suppliedName ?? ("reuniao." + ext));
      form.append("title", title.trim() || "Registro de reunião — " + new Date().toLocaleDateString("pt-BR"));
      form.append("category", category);
      form.append("consent", String(consent));
      if (bookingId) form.append("bookingId", bookingId);
      const response = await fetch("/api/meeting-memory", { method: "POST", body: form });
      const data = await response.json() as { recording?: { id: string }; error?: { message: string } };
      if (!response.ok || !data.recording) throw new Error(data.error?.message ?? "Não foi possível salvar a gravação");
      await refresh();
      setSelected(data.recording.id);
      setNote("Gravação protegida e salva. A transcrição automática ocorre quando o processador local está ativo.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no envio"); }
    finally { setBusy(false); }
  }
  async function startRecording() {
    if (!consent) { setError("Registre a autorização dos participantes antes de gravar."); return; }
    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setError("Este navegador não permite gravação de áudio por esta página."); return;
    }
    setError(""); setNote("");
    const streams: MediaStream[] = [];
    let context: AudioContext | null = null;
    try {
      let source: MediaStream;
      if (mode === "tab") {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streams.push(screen);
        if (screen.getAudioTracks().length === 0) {
          throw new Error("O navegador não disponibilizou o áudio da aba. Use Chrome/Edge, compartilhe a aba e marque compartilhar áudio; ou grave pelo microfone.");
        }
        const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
        streams.push(mic);
        context = new AudioContext();
        const mixed = context.createMediaStreamDestination();
        context.createMediaStreamSource(new MediaStream(screen.getAudioTracks())).connect(mixed);
        context.createMediaStreamSource(mic).connect(mixed);
        source = mixed.stream;
        screen.getVideoTracks().forEach(t => { t.onended = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }; });
      } else {
        source = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
        streams.push(source);
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"]
        .find(m => MediaRecorder.isTypeSupported(m));
      if (!mimeType) throw new Error("Seu navegador não suporta os formatos de áudio previstos.");
      const recorder = new MediaRecorder(source, { mimeType, audioBitsPerSecond: 48000 });
      activeStreams.current = streams; audioContext.current = context;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (evt) => { if (evt.data.size) chunks.push(evt.data); };
      recorder.onerror = () => setError("Falha na captura. Confira as permissões do navegador.");
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
        streams.forEach(s => s.getTracks().forEach(t => t.stop()));
        void context?.close();
        audioContext.current = null; activeStreams.current = [];
        recorderRef.current = null; setRecording(false);
        if (timer.current) clearInterval(timer.current);
        if (blob.size > 256) void uploadAudio(blob);
      };
      recorderRef.current = recorder; started.current = Date.now(); setElapsed(0);
      timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
      recorder.start(1000); setRecording(true);
    } catch (e) {
      streams.forEach(s => s.getTracks().forEach(t => t.stop()));
      void context?.close();
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a gravação.");
    }
  }
  async function analyze() {
    if (!current) return;
    setBusy(true); setError(""); setNote("");
    try {
      const response = await fetch("/api/meeting-memory/" + current.id + "/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: draftTranscript, allowExternalAi }),
      });
      const data = await response.json() as { analysis?: Analysis; error?: { message: string } };
      if (!response.ok) throw new Error(data.error?.message || "Não foi possível analisar");
      await refresh();
      setNote(data.analysis?.method === "ai"
        ? "Resumo e tarefas sugeridas. Revise antes de delegar."
        : "Classificação local concluída. Para extrair decisões e tarefas, configure um modelo em Configurações → IA e autorize o envio.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao analisar"); }
    finally { setBusy(false); }
  }
  async function approve(index: number) {
    if (!current) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/meeting-memory/" + current.id + "/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suggestionIndex: index }),
      });
      if (!response.ok) throw new Error("Não foi possível aprovar a tarefa");
      await refreshTasks(current.id);
      setNote("Tarefa aprovada e adicionada ao acompanhamento.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }
  async function setTaskStatus(taskId: string, status: string) {
    if (!current) return;
    const res = await fetch("/api/meeting-memory/" + current.id + "/tasks", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, status }),
    });
    if (res.ok) await refreshTasks(current.id);
    else setError("Não foi possível atualizar a tarefa");
  }
  return (
    <div className="h-full overflow-y-auto bg-subtle">
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-7 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-3">PAINEL NOVAGENTE / INTELIGÊNCIA</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Memória inteligente</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-2">Grave com permissão, preserve conversas e transforme decisões em tarefas com rastreabilidade.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-text-2">
            <CheckCircle2 className="h-4 w-4" /> Arquivos por empresa
          </div>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {note && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{note}</div>}
        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Mic2 className="h-5 w-5 text-brand" /><h2 className="text-lg font-bold">Novo registro</h2></div>
              <label className="mb-1 block text-xs font-semibold">Título da conversa</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Diagnóstico com cliente" disabled={recording}/>
              <label className="mb-1 mt-4 block text-xs font-semibold">Finalidade</label>
              <select className="h-10 w-full rounded-lg border bg-card px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)} disabled={recording}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <label className="mb-1 mt-4 block text-xs font-semibold">Vincular a compromisso (opcional)</label>
              <select className="h-10 w-full rounded-lg border bg-card px-3 text-sm" value={bookingId} onChange={e => setBookingId(e.target.value)} disabled={recording}>
                <option value="">Sem compromisso vinculado</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{b.date} {b.time} · {b.contact?.name ?? "Compromisso"}</option>)}
              </select>
              <label className="mt-5 flex items-start gap-3 rounded-xl border bg-subtle p-3 text-xs leading-5">
                <input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={recording}/>
                <span>Confirmo que os participantes foram informados sobre a gravação e que tenho autorização para registrá-la, conforme as regras aplicáveis.</span>
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={()=>setMode("microphone")} disabled={recording}
                  className={"rounded-xl border p-3 text-left text-xs " + (mode==="microphone"?"border-brand bg-brand-tint":"bg-card")}>
                  <Mic2 className="mb-2 h-5 w-5"/> Microfone / presencial
                </button>
                <button type="button" onClick={()=>setMode("tab")} disabled={recording}
                  className={"rounded-xl border p-3 text-left text-xs " + (mode==="tab"?"border-brand bg-brand-tint":"bg-card")}>
                  <MonitorUp className="mb-2 h-5 w-5"/> Aba + microfone
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                {!recording ? (
                  <Button className="flex-1" disabled={!consent || busy} onClick={()=>void startRecording()}><Mic2 className="mr-2 h-4 w-4"/> Iniciar gravação</Button>
                ) : (
                  <Button className="flex-1" onClick={()=>recorderRef.current?.stop()}><Square className="mr-2 h-4 w-4"/> Parar e salvar · {String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</Button>
                )}
                <Button variant="outline" disabled={busy || !consent || recording} onClick={()=>fileInput.current?.click()}><UploadCloud className="h-4 w-4"/></Button>
                <input ref={fileInput} type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,.m4a" className="hidden"
                  onChange={e=>{ const f=e.target.files?.[0]; if (f) void uploadAudio(f,f.name); e.target.value=""; }}/>
              </div>
              <p className="mt-3 text-xs leading-5 text-text-3">Limite de 40 MB por gravação. Para captar o áudio do Meet, use um navegador compatível e selecione o compartilhamento de áudio da aba. O microfone isolado não garante captar outras pessoas.</p>
            </section>
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><FileAudio2 className="h-4 w-4"/> Histórico de gravações</h2>
              {records.length===0 && <p className="rounded-lg bg-subtle p-4 text-sm text-text-2">Nenhuma gravação ainda. Comece um registro com autorização.</p>}
              <div className="max-h-[470px] space-y-2 overflow-y-auto">
                {records.map(rec => <button key={rec.id} type="button" onClick={()=>setSelected(rec.id)}
                  className={"w-full rounded-xl border px-3 py-3 text-left transition hover:border-brand " + (selected===rec.id?"border-brand bg-brand-tint":"bg-card")}>
                  <div className="flex items-start justify-between gap-2"><strong className="text-sm">{rec.title}</strong><PlayCircle className="h-4 w-4 shrink-0 text-text-3"/></div>
                  <p className="mt-1 text-xs text-text-3">{formatted(rec.createdAt)} · {rec.status==="analyzed"?"Analisada":rec.status==="transcribed"?"Transcrita":rec.status==="processing"?"Transcrevendo":rec.status==="error"?"Erro na transcrição":"Aguardando transcrição"}</p>
                </button>)}
              </div>
              <Button variant="outline" className="mt-3 w-full" disabled={busy} onClick={()=>void refresh()}>Atualizar histórico</Button>
            </section>
          </aside>
          <div className="min-w-0 space-y-4">
            {!current ? (
              <section className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center">
                <Sparkles className="mb-4 h-12 w-12 text-brand" />
                <h2 className="text-xl font-bold">Conversas que viram resultados</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-text-2">Selecione uma gravação para ouvir, revisar a transcrição, encontrar compromissos assumidos e organizar as próximas ações.</p>
              </section>
            ) : <>
              <section className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="text-xs uppercase tracking-wider text-text-3">Registro selecionado</p><h2 className="mt-1 text-xl font-bold">{current.title}</h2><p className="mt-1 text-xs text-text-3">{formatted(current.createdAt)} · {current.category}</p></div>
                  {current.bookingId && <span className="flex h-fit items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-xs"><CalendarCheck2 className="h-4 w-4"/> Vinculado à agenda</span>}
                </div>
                <audio controls preload="metadata" className="mt-5 w-full" src={"/api/meeting-memory/"+current.id+"/audio"}/>
                <p className="mt-2 text-xs text-text-3">Áudio acessível somente a usuários autenticados da mesma empresa.</p>
              </section>
              <section className="rounded-2xl border bg-card p-5">
                <h3 className="mb-2 text-base font-bold">Transcrição</h3>
                <p className="mb-3 text-xs text-text-2">O processador local pode gerar a transcrição automaticamente. Você também pode revisar, corrigir ou colar uma transcrição autorizada.</p>
                <Textarea rows={10} value={draftTranscript} onChange={e=>setDraftTranscript(e.target.value)}
                  placeholder={current.status==="pending"?"Aguardando serviço de transcrição ou insira o texto autorizado aqui…":"Revise o conteúdo da conversa…"} />
                <label className="mt-4 flex items-start gap-2 text-xs text-text-2">
                  <input className="mt-0.5" type="checkbox" checked={allowExternalAi} onChange={e=>setAllowExternalAi(e.target.checked)}/>
                  <span>Autorizo o envio desta transcrição ao provedor de IA configurado para esta empresa, para extrair resumo, decisões e tarefas.</span>
                </label>
                <Button disabled={busy || draftTranscript.trim().length<20} className="mt-3" onClick={()=>void analyze()}>
                  <Sparkles className="mr-2 h-4 w-4"/> {busy?"Processando…":"Analisar conversa"}
                </Button>
                {current.errorReason && <p className="mt-2 text-xs text-red-700">{current.errorReason}</p>}
              </section>
              {current.analysis && <section className="space-y-4 rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2"><h3 className="text-base font-bold">Inteligência da reunião</h3>
                  <span className="rounded-lg bg-subtle px-3 py-1 text-xs">{current.analysis.method==="ai"?"Análise com IA":"Classificação local"}</span>
                </div>
                <p className="text-sm leading-6 text-text-2">{current.analysis.summary}</p>
                <div className="flex flex-wrap gap-2">{current.analysis.tags.map(tag=><span key={tag} className="rounded-full border bg-subtle px-3 py-1 text-xs">{tag}</span>)}</div>
                {current.analysis.decisions.length>0 && <div><h4 className="mb-2 text-sm font-semibold">Decisões</h4>{current.analysis.decisions.map((d,i)=><p key={i} className="my-2 text-sm">• {d}</p>)}</div>}
                {current.analysis.objections.length>0 && <div><h4 className="mb-2 text-sm font-semibold">Objeções e dúvidas</h4>{current.analysis.objections.map((d,i)=><p key={i} className="my-2 text-sm">• {d}</p>)}</div>}
                <div><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4"/> Próximas ações propostas</h4>
                  {current.analysis.suggestedTasks.length===0 && <p className="text-sm text-text-3">Nenhuma ação comprovada foi extraída nesta análise.</p>}
                  {current.analysis.suggestedTasks.map((s,i)=>{
                    const approved=tasks.some(t=>t.id!=="never" && t.description===s.description);
                    return <div key={i} className="mb-2 rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><div>
                      <p className="text-sm font-semibold">{s.description}</p>
                      <p className="mt-1 text-xs text-text-2">{s.source==="explicit"?"Compromisso mencionado":"Sugestão de melhoria"}</p>
                      {s.evidence && <p className="mt-2 text-xs italic text-text-3">Trecho: “{s.evidence}”</p>}
                      {s.dueDate && <p className="mt-1 flex items-center gap-1 text-xs text-text-3"><Clock3 className="h-3 w-3"/>{s.dueDate}</p>}
                    </div><Button size="sm" disabled={approved||busy} onClick={()=>void approve(i)}>{approved?"Aprovada":"Aprovar tarefa"}</Button></div></div>;
                  })}
                </div>
              </section>}
              <section className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 text-sm font-bold">Tarefas aprovadas</h3>
                {tasks.length===0?<p className="text-sm text-text-3">A IA não delega sozinha: as propostas aprovadas aparecerão aqui.</p>:
                  <div className="space-y-2">{tasks.map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                    <div><p className="text-sm font-semibold">{t.description}</p><p className="text-xs text-text-3">{t.source==="explicit"?"Combinada na reunião":"Sugestão aprovada"}</p></div>
                    <select aria-label="Andamento da tarefa" className="rounded-lg border bg-card p-2 text-xs" value={t.status} onChange={e=>void setTaskStatus(t.id,e.target.value)}>
                      <option value="pending">Pendente</option><option value="doing">Em andamento</option><option value="done">Concluída</option>
                    </select>
                  </div>)}</div>}
              </section>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

import json, logging, os, pathlib, re, time
import psycopg
from psycopg.rows import dict_row
logging.basicConfig(level=logging.INFO)
DB=os.environ["DATABASE_URL"]
MEDIA=pathlib.Path(os.getenv("MEDIA_DIR","/data/media"))
MODEL=os.getenv("WHISPER_MODEL","base")
model=None
def claim():
    with psycopg.connect(DB,row_factory=dict_row) as con:
        with con.transaction():
            item=con.execute("""
                SELECT id,organization_id,extension FROM meeting_recording
                WHERE status='pending' OR (status='processing' AND processing_started_at < now()-interval '60 minutes')
                ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
            """).fetchone()
            if item:
                con.execute("UPDATE meeting_recording SET status='processing',processing_started_at=now(),updated_at=now() WHERE id=%s",(item["id"],))
            return item
def run(item):
    global model
    i,o,e=item["id"],item["organization_id"],item["extension"]
    if not re.fullmatch(r"[a-f0-9-]{36}",i,re.I) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}",o) or e not in ("webm","ogg","mp4","wav","mp3"):
        raise ValueError("Identificador invalido")
    audio=MEDIA/o/"meeting-memory"/(i+"."+e)
    if not audio.is_file() or audio.stat().st_size>40*1024*1024: raise ValueError("Arquivo ausente ou muito grande")
    if model is None:
        from faster_whisper import WhisperModel
        model=WhisperModel(MODEL,device="cpu",compute_type="int8",cpu_threads=2)
    segments,_=model.transcribe(str(audio),language="pt",vad_filter=True,beam_size=3)
    text="\n".join("[{0:02d}:{1:02d}] {2}".format(int(s.start)//60,int(s.start)%60,s.text.strip()) for s in segments).strip()
    if not text: raise ValueError("Nenhuma fala reconhecida")
    t=text.lower()
    tags=[n for n,p in [("Venda",r"venda|proposta|orçamento|preço"),("Atendimento",r"atendimento|suporte"),("Reunião",r"reunião|agenda"),("Projeto",r"projeto|implantação")] if re.search(p,t)]
    category="venda" if "Venda" in tags else "atendimento" if "Atendimento" in tags else "reuniao"
    summary="Transcrição concluída. Revise o texto e solicite análise de IA para identificar decisões e tarefas."
    analysis=dict(summary=summary,category=category,tags=tags,decisions=[],objections=[],suggestedTasks=[],method="local_rules")
    with psycopg.connect(DB) as con:
        con.execute("""UPDATE meeting_recording SET status='transcribed',transcript=%s,summary=%s,category=%s,analysis=%s::jsonb,error_reason=NULL,updated_at=now()
                       WHERE id=%s AND organization_id=%s""",(text[:120000],summary,category,json.dumps(analysis,ensure_ascii=False),i,o))
    logging.info("Transcrição local concluída: %s",i)
if __name__=="__main__":
    logging.info("Iniciando worker NOVAGENTE de transcrição offline")
    while True:
        try:
            item=claim()
            if item:
                try: run(item)
                except Exception as ex:
                    logging.exception("Falha em reunião %s",item["id"])
                    with psycopg.connect(DB) as con:
                        con.execute("UPDATE meeting_recording SET status='error',error_reason=%s,updated_at=now() WHERE id=%s AND organization_id=%s",
                          ((type(ex).__name__+": "+str(ex))[:350],item["id"],item["organization_id"]))
            else:time.sleep(8)
        except Exception:
            logging.exception("Falha temporária do processador")
            time.sleep(12)

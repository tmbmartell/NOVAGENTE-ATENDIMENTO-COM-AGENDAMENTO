import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq, desc, and } from "drizzle-orm";
import { apiError, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { MAX_RECORDING_BYTES, recordingFormat, safeRecordingPath } from "@/server/meeting-memory/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withAuth(async (session) => {
  const rows = await getDb().select({
    id: schema.meetingRecording.id,
    title: schema.meetingRecording.title,
    category: schema.meetingRecording.category,
    status: schema.meetingRecording.status,
    bookingId: schema.meetingRecording.bookingId,
    transcript: schema.meetingRecording.transcript,
    summary: schema.meetingRecording.summary,
    analysis: schema.meetingRecording.analysis,
    errorReason: schema.meetingRecording.errorReason,
    createdAt: schema.meetingRecording.createdAt,
  }).from(schema.meetingRecording)
    .where(eq(schema.meetingRecording.organizationId, session.organizationId))
    .orderBy(desc(schema.meetingRecording.createdAt)).limit(50);
  return Response.json({ recordings: rows }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = withAuth(async (session, req: Request) => {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_RECORDING_BYTES + 1024 * 1024) return apiError(413, "too_large", "Gravação acima de 40 MB");
  const form = await req.formData().catch(() => null);
  if (!form) return apiError(422, "invalid", "Envie um formulário de gravação");
  if (form.get("consent") !== "true") return apiError(422, "consent", "Confirme a autorização para gravar");
  const file = form.get("audio");
  if (!(file instanceof File) || file.size < 256 || file.size > MAX_RECORDING_BYTES) {
    return apiError(422, "audio", "Arquivo de áudio inválido ou acima de 40 MB");
  }
  const title = String(form.get("title") || "").trim();
  if (title.length < 3 || title.length > 180) return apiError(422, "title", "Informe um título de 3 a 180 caracteres");
  const category = String(form.get("category") || "reuniao");
  if (!["reuniao", "atendimento", "venda", "outro"].includes(category)) return apiError(422, "category", "Tipo inválido");
  const bookingId = String(form.get("bookingId") || "").trim() || null;
  if (bookingId) {
    const rows = await getDb().select({ id: schema.booking.id }).from(schema.booking)
      .where(and(eq(schema.booking.id, bookingId), eq(schema.booking.organizationId, session.organizationId), eq(schema.booking.isTest, false))).limit(1);
    if (!rows[0]) return apiError(404, "booking", "Compromisso não encontrado");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = recordingFormat(file.type, bytes.subarray(0, 16));
  if (!ext) return apiError(422, "format", "Formato inválido. Use WebM, OGG, M4A, WAV ou MP3");
  const id = randomUUID();
  const full = safeRecordingPath(session.organizationId, id, ext);
  await mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, bytes, { flag: "wx", mode: 0o600 });
  try {
    await getDb().insert(schema.meetingRecording).values({
      id, organizationId: session.organizationId, bookingId, title, category,
      status: "pending", mimeType: file.type, extension: ext, sizeBytes: file.size,
      consentConfirmedAt: new Date(), recordedByUserId: session.userId,
    });
  } catch (err) {
    await unlink(full).catch(() => {});
    throw err;
  }
  return Response.json({ recording: { id, title, status: "pending" } }, { status: 201 });
});

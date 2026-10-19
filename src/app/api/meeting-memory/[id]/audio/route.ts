import { readFile } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import { apiError, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { safeRecordingPath } from "@/server/meeting-memory/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = withAuth(async (session, req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const rows = await getDb().select().from(schema.meetingRecording)
    .where(and(eq(schema.meetingRecording.id, id), eq(schema.meetingRecording.organizationId, session.organizationId))).limit(1);
  const item = rows[0];
  if (!item) return apiError(404, "not_found", "Gravação não encontrada");
  const full = safeRecordingPath(item.organizationId, item.id, item.extension);
  const bytes = await readFile(full).catch(() => null);
  if (!bytes) return apiError(410, "gone", "Arquivo de gravação não disponível");
  const range = req.headers.get("range");
  let start = 0, end = bytes.length - 1, partial = false;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + bytes.length } });
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= bytes.length) {
      return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + bytes.length } });
    }
    partial = true;
  }
  return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
    status: partial ? 206 : 200,
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      ...(partial ? { "Content-Range": "bytes " + start + "-" + end + "/" + bytes.length } : {}),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});

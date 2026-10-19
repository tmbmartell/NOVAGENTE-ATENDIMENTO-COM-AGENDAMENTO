import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, apiError, parseBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { analyzeMemory } from "@/server/meeting-memory/analysis";
import { MAX_TRANSCRIPT_LENGTH } from "@/server/meeting-memory/storage";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const bodySchema = z.object({
  transcript: z.string().trim().min(20).max(MAX_TRANSCRIPT_LENGTH),
  allowExternalAi: z.boolean().default(false),
});

export const POST = withAuth(async (session, req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, bodySchema);
  if (!input.ok) return input.response;
  const db = getDb();
  const where = and(eq(schema.meetingRecording.id, id), eq(schema.meetingRecording.organizationId, session.organizationId));
  const existing = await db.select({ id: schema.meetingRecording.id }).from(schema.meetingRecording).where(where).limit(1);
  if (!existing[0]) return apiError(404, "not_found", "Gravação não encontrada");
  const analysis = await analyzeMemory(session.organizationId, input.data.transcript, input.data.allowExternalAi ?? false);
  await db.update(schema.meetingRecording).set({
    transcript: input.data.transcript, summary: analysis.summary, category: analysis.category,
    analysis, status: "analyzed", errorReason: null, updatedAt: new Date(),
  }).where(where);
  return Response.json({ analysis });
});

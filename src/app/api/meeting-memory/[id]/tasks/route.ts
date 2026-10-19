import { createHash } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { memoryAnalysisSchema } from "@/server/meeting-memory/analysis";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export const GET = withAuth(async (session, _req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const db = getDb();
  const found = await db.select({ id: schema.meetingRecording.id }).from(schema.meetingRecording)
    .where(and(eq(schema.meetingRecording.id, id), eq(schema.meetingRecording.organizationId, session.organizationId))).limit(1);
  if (!found[0]) return apiError(404, "not_found", "Reunião não encontrada");
  const tasks = await db.select().from(schema.meetingTask)
    .where(and(eq(schema.meetingTask.recordingId, id), eq(schema.meetingTask.organizationId, session.organizationId)));
  return Response.json({ tasks });
});

const bodySchema = z.object({ suggestionIndex: z.number().int().min(0).max(13), assignedUserId: z.string().optional() });
export const POST = withAuth(async (session, req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const parsed = await parseBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const db = getDb();
  const rows = await db.select({ analysis: schema.meetingRecording.analysis }).from(schema.meetingRecording)
    .where(and(eq(schema.meetingRecording.id, id), eq(schema.meetingRecording.organizationId, session.organizationId))).limit(1);
  if (!rows[0]) return apiError(404, "not_found", "Reunião não encontrada");
  const a = memoryAnalysisSchema.safeParse(rows[0].analysis);
  const proposal = a.success ? a.data.suggestedTasks[parsed.data.suggestionIndex] : null;
  if (!proposal) return apiError(422, "suggestion", "Tarefa sugerida não encontrada");
  if (parsed.data.assignedUserId) {
    const member = await db.select({ id: schema.member.userId }).from(schema.member)
      .where(and(eq(schema.member.organizationId, session.organizationId), eq(schema.member.userId, parsed.data.assignedUserId))).limit(1);
    if (!member[0]) return apiError(422, "assignee", "O responsável não pertence à empresa");
  }
  const stableId = "mt_" + createHash("sha256").update(id + ":" + parsed.data.suggestionIndex).digest("hex").slice(0, 32);
  await db.insert(schema.meetingTask).values({
    id: stableId, organizationId: session.organizationId, recordingId: id,
    description: proposal.description, evidence: proposal.evidence,
    source: proposal.source, assignedUserId: parsed.data.assignedUserId || null,
    approvedByUserId: session.userId,
    dueAt: /^\d{4}-\d{2}-\d{2}$/.test(proposal.dueDate || "") ? new Date(proposal.dueDate + "T12:00:00Z") : null,
  }).onConflictDoNothing();
  return Response.json({ ok: true, taskId: stableId }, { status: 201 });
});
const patchSchema = z.object({ taskId: z.string(), status: z.enum(["pending", "doing", "done"]) });
export const PATCH = withAuth(async (session, req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, patchSchema);
  if (!input.ok) return input.response;
  const rows = await getDb().update(schema.meetingTask).set({ status: input.data.status, updatedAt: new Date() })
    .where(and(eq(schema.meetingTask.id, input.data.taskId), eq(schema.meetingTask.recordingId, id),
      eq(schema.meetingTask.organizationId, session.organizationId))).returning({ id: schema.meetingTask.id });
  if (!rows[0]) return apiError(404, "not_found", "Tarefa não encontrada");
  return Response.json({ ok: true });
});

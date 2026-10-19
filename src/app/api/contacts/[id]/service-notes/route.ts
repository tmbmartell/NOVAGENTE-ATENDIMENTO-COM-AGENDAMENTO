import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const categories = ["geral", "simulacao", "orcamento", "necessidade", "duvida", "retorno"] as const;

async function contactBelongs(org: string, contactId: string) {
  const rows = await getDb().select({ id: schema.contact.id }).from(schema.contact)
    .where(and(eq(schema.contact.id, contactId), eq(schema.contact.organizationId, org))).limit(1);
  return !!rows[0];
}
export const GET = withAuth(async (session, _req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  if (!await contactBelongs(session.organizationId, id)) return apiError(404, "not_found", "Contato não encontrado");
  const rows = await getDb().select({
    id: schema.contactServiceNote.id,
    body: schema.contactServiceNote.body,
    category: schema.contactServiceNote.category,
    author: schema.user.name,
    createdAt: schema.contactServiceNote.createdAt,
  }).from(schema.contactServiceNote)
    .leftJoin(schema.user, eq(schema.contactServiceNote.authorUserId, schema.user.id))
    .where(and(eq(schema.contactServiceNote.contactId, id), eq(schema.contactServiceNote.organizationId, session.organizationId)))
    .orderBy(desc(schema.contactServiceNote.createdAt)).limit(100);
  return Response.json({ notes: rows }, { headers: { "Cache-Control": "no-store" } });
});
const createSchema = z.object({
  category: z.enum(categories),
  body: z.string().trim().min(4).max(2500),
});
export const POST = withAuth(async (session, req: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, createSchema);
  if (!input.ok) return input.response;
  if (!await contactBelongs(session.organizationId, id)) return apiError(404, "not_found", "Contato não encontrado");
  const [note] = await getDb().insert(schema.contactServiceNote).values({
    id: randomUUID(), organizationId: session.organizationId, contactId: id,
    authorUserId: session.userId, category: input.data.category, body: input.data.body,
  }).returning({ id: schema.contactServiceNote.id });
  return Response.json({ note }, { status: 201 });
});

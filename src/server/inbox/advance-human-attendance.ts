import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { moveLeadToStage } from "@/server/leads/stage-history";
import { publish } from "@/server/events/bus";

/**
 * Apenas o primeiro envio humano bem-sucedido faz Novo contato -> Em atendimento.
 * Mensagens seguintes jamais reposicionam um cliente qualificado, perdido ou ganho.
 * A trilha do funil passa pela porta transacional original para preservar histórico.
 */
export async function advanceFirstHumanReply(orgId: string, conversationId: string, userId: string) {
  const db = getDb();
  const rows = await db.select({
    leadId: schema.lead.id,
    current: schema.pipelineStage.name,
    contactId: schema.conversation.contactId,
  }).from(schema.conversation)
    .innerJoin(schema.lead, eq(schema.conversation.contactId, schema.lead.contactId))
    .innerJoin(schema.pipelineStage, eq(schema.pipelineStage.id, schema.lead.stageId))
    .where(and(
      eq(schema.conversation.id, conversationId),
      eq(schema.conversation.organizationId, orgId),
      eq(schema.conversation.isTest, false),
      eq(schema.lead.organizationId, orgId)
    )).limit(1);
  const row = rows[0];
  if (!row || row.current !== "Novo contato") return;
  const targets=await db.select({ id: schema.pipelineStage.id }).from(schema.pipelineStage)
    .where(and(eq(schema.pipelineStage.organizationId, orgId), eq(schema.pipelineStage.name, "Em atendimento")))
    .limit(1);
  if (!targets[0]) return;
  const result = await moveLeadToStage({
    organizationId: orgId, leadId: row.leadId,
    toStageId: targets[0].id, source: "dueno", actorUserId: userId,
  });
  if (result.ok && result.changed) publish(orgId, {
    type: "conversation.updated", data: { conversation: { id: conversationId } },
  });
}

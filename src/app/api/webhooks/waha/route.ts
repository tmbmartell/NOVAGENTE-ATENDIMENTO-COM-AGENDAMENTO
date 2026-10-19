import { resolveInstanceOrg } from "@/server/bot/auth";
import { ingestInboundMessage } from "@/server/inbox/ingest";
import { getWahaConfig, wahaEnabled } from "@/server/waha/config";
import { normalizeWahaMessage, verifyWahaHmac, type WahaPayload } from "@/server/waha/adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!wahaEnabled()) return new Response(null, {status:404});
  const key = process.env.WAHA_WEBHOOK_HMAC_KEY || "";
  if (key.length < 16) return new Response("Webhook HMAC não configurado", {status:503});
  if (Number(request.headers.get("content-length") || 0) > 1048576)
    return new Response(null,{status:413});
  const body = await request.text();
  if (body.length > 1048576) return new Response(null,{status:413});
  if (!verifyWahaHmac(body,request.headers.get("x-webhook-hmac"),key))
    return new Response(null,{status:401});
  let event:WahaPayload;
  try { event = JSON.parse(body) as WahaPayload; }
  catch { return new Response(null,{status:400}); }
  const message = normalizeWahaMessage(event,getWahaConfig().session);
  if (!message) return Response.json({received:true,skipped:true});
  const org = await resolveInstanceOrg();
  if (!org) return Response.json({error:"no_org"},{status:503});
  await ingestInboundMessage({organizationId:org,...message});
  return Response.json({received:true});
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeMx } from "@/lib/meta/client";
import { wahaEnabled } from "@/server/waha/config";

export type WahaPayload = {
  event?: string; session?: string;
  payload?: {
    id?: string; from?: string; chatId?: string; fromMe?: boolean;
    body?: string; hasMedia?: boolean;
    timestamp?: number | string; notifyName?: string; pushName?: string;
  };
};

export function verifyWahaHmac(body: string, header: string | null, key: string) {
  if (!header || key.length < 16) return false;
  const hex = header.startsWith("sha512=") ? header.slice(7) : header;
  if (!/^[0-9a-f]{128}$/i.test(hex)) return false;
  const incoming = Buffer.from(hex, "hex");
  const expected = createHmac("sha512", key).update(body).digest();
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}

export function normalizeWahaMessage(data: WahaPayload, expectedSession: string) {
  if (data.event !== "message" || data.session !== expectedSession) return null;
  const msg = data.payload;
  if (!msg?.id || msg.fromMe) return null;
  const chat = msg.chatId || msg.from || "";
  if (chat.endsWith("@g.us") || chat.endsWith("@newsletter") || chat === "status@broadcast")
    return null;
  const phoneMatch = /^(\d+)@(c\.us|s\.whatsapp\.net)$/.exec(chat);
  const lidMatch = /^(\d+)@lid$/.exec(chat);
  if (!phoneMatch && !lidMatch) return null;
  const phone = phoneMatch ? normalizeMx(phoneMatch[1]!) : null;
  const identity = phone ? phone : "bsuid:" + chat;
  const stamp = Number(msg.timestamp);
  const timestamp = Number.isFinite(stamp) && stamp > 0
    ? String(stamp > 1e12 ? Math.floor(stamp / 1000) : stamp)
    : String(Math.floor(Date.now() / 1000));
  const text = msg.body?.trim() || (msg.hasMedia ? "[Mídia recebida pelo WAHA; conteúdo não disponível]" : "");
  if (!text) return null;
  return {
    identity: { identity, channel: "whatsapp" as const, phone,
      waUserId: lidMatch ? chat : null,
      profileName: msg.notifyName ?? msg.pushName ?? null },
    waMessageId: "waha:" + expectedSession + ":" + msg.id,
    type: "text", text, timestamp,
  };
}

export { wahaEnabled };

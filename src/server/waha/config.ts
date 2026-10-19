export function wahaEnabled(): boolean {
  return process.env.WAHA_ENABLED === "true";
}

export function getWahaConfig() {
  const baseUrl = process.env.WAHA_URL;
  const apiKey = process.env.WAHA_API_KEY;
  const session = process.env.WAHA_SESSION || "novagente";
  if (!wahaEnabled() || !baseUrl || !apiKey) throw new Error("WAHA não configurado");
  const u = new URL(baseUrl);
  if (!["http:","https:"].includes(u.protocol) || u.username || u.password)
    throw new Error("WAHA_URL inválida");
  return { baseUrl: u.origin, apiKey, session };
}

export function contactChatId(contact: { phone: string | null; waIdentity: string; waUserId: string | null }) {
  if (contact.waUserId?.endsWith("@lid")) return contact.waUserId;
  const lid = contact.waIdentity.startsWith("bsuid:") ? contact.waIdentity.slice(6) : "";
  if (lid.endsWith("@lid")) return lid;
  const phone = (contact.phone || contact.waIdentity).replace(/\D/g, "");
  return /^\d{8,15}$/.test(phone) ? phone + "@c.us" : null;
}

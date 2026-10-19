import { getWahaConfig } from "@/server/waha/config";

async function wahaPost(endpoint: string, body: Record<string,unknown>): Promise<string | null> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const res = await fetch(baseUrl + endpoint, {
    method: "POST",
    headers: {"X-Api-Key": apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({ session, ...body }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("WAHA: falha HTTP " + res.status);
  const result = await res.json().catch(() => ({})) as { id?: string | {id?: string} };
  return typeof result.id === "string" ? result.id : result.id?.id ?? null;
}

export function wahaSendText(chatId: string, text: string) {
  return wahaPost("/api/sendText", { chatId, text });
}
export function wahaSendMedia(
  chatId: string,
  kind: "image" | "video" | "audio" | "document" | "sticker",
  file: { data: Buffer; mimeType: string; fileName?: string },
  caption?: string,
) {
  const url = { image: "/api/sendImage", video: "/api/sendVideo",
    audio: "/api/sendVoice", document: "/api/sendFile", sticker: "/api/sendImage" }[kind];
  return wahaPost(url, {chatId,
    file: { data: file.data.toString("base64"),
      mimetype: file.mimeType, filename: file.fileName || "arquivo" },
    ...(caption && kind !== "audio" ? {caption} : {}),
  });
}

export async function wahaSessionStatus(): Promise<string> {
  const {baseUrl,apiKey,session} = getWahaConfig();
  const r = await fetch(baseUrl + "/api/sessions/" + encodeURIComponent(session), {
    headers: {"X-Api-Key":apiKey}, cache:"no-store",
    signal:AbortSignal.timeout(4000),
  });
  if (r.status===404) return "NOT_CREATED";
  if (!r.ok) return "ERROR_" + r.status;
  const json = await r.json() as {status?: string};
  return json.status || "UNKNOWN";
}

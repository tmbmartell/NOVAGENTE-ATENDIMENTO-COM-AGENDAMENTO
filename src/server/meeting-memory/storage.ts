import path from "node:path";
import { getEnv } from "@/lib/env";

export const MAX_RECORDING_BYTES = 40 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 120_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safeRecordingPath(org: string, id: string, ext: string): string {
  if (!UUID.test(id) || !/^[a-zA-Z0-9_-]{1,100}$/.test(org) || !/^(webm|ogg|mp4|wav|mp3)$/.test(ext)) {
    throw new Error("Identificador de gravação inválido");
  }
  return path.join(getEnv().MEDIA_DIR, org, "meeting-memory", id + "." + ext);
}

export function recordingFormat(mime: string, first: Uint8Array): string | null {
  const head = Buffer.from(first);
  const starts = (ascii: string) => head.subarray(0, ascii.length).toString("ascii") === ascii;
  if (mime.startsWith("audio/webm") && head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  if (mime.startsWith("audio/ogg") && starts("OggS")) return "ogg";
  if ((mime.startsWith("audio/mp4") || mime.startsWith("audio/x-m4a")) && head.subarray(4,8).toString("ascii") === "ftyp") return "mp4";
  if (mime.startsWith("audio/wav") && starts("RIFF") && head.subarray(8,12).toString("ascii") === "WAVE") return "wav";
  if (mime.startsWith("audio/mpeg") && (starts("ID3") || (head[0] === 0xff && (head[1]! & 0xe0) === 0xe0))) return "mp3";
  return null;
}

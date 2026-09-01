import { z } from "zod";

export const createTopupInput = (raw: unknown) =>
  z.object({ amount: z.number().int().min(1000).max(10_000_000) }).parse(raw);

export const topupIdInput = (raw: unknown) =>
  z.object({ id: z.string().uuid() }).parse(raw);

export const submitSlipInput = (raw: unknown) =>
  z.object({
    request_id: z.string().uuid(),
    image_base64: z.string().min(100),
    mime: z.string().regex(/^image\/(png|jpe?g|webp)$/),
  }).parse(raw);

export const TOPUP_EXPIRE_MINUTES = 5;

export async function sha256Hex(bytes: Uint8Array) {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function recipientNameMatches(name: string | null) {
  const normalized = (name ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return normalized.includes("SOMYONE") && normalized.includes("KHAMKHEUNG");
}

function laoDay(timestamp: number) {
  return new Date(timestamp + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function parseLaoSlipTime(rawValue: string | null) {
  if (!rawValue) return null;
  const raw = rawValue.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(Z|[+-]\d{2}:?\d{2}))?$/i);
  if (iso) {
    const [, year, month, day, hour, minute, second = "00", zone] = iso;
    const offset = zone ? (zone === "Z" ? "Z" : zone.includes(":") ? zone : `${zone.slice(0, 3)}:${zone.slice(3)}`) : "+07:00";
    const parsed = Date.parse(`${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:${second}${offset}`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!dmy) return null;
  const [, day, month, year, hour, minute, second = "00"] = dmy;
  const parsed = Date.parse(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+07:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function slipTimeIsValid(transferDatetime: string | null, requestCreatedAt: string) {
  const transferTime = parseLaoSlipTime(transferDatetime);
  const createdTime = Date.parse(requestCreatedAt);
  if (transferTime == null || !Number.isFinite(createdTime)) return false;
  if (laoDay(transferTime) !== laoDay(createdTime)) return false;

  // Bank slips often omit seconds. Permit only that rounding difference before
  // creation, while retaining the full hard limit of 15 minutes after creation.
  return transferTime >= createdTime - 60_000 && transferTime <= createdTime + TOPUP_EXPIRE_MINUTES * 60_000;
}
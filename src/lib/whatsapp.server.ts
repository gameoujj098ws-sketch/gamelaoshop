/**
 * Server-only WhatsApp notifier for the shop owner.
 * Uses the CallMeBot WhatsApp API (free) when CALLMEBOT_WHATSAPP_APIKEY is set.
 * Silently no-ops when unconfigured so business logic never breaks.
 */
const DEFAULT_PHONE = "8562095904376"; // 209 590 4376 (Laos)

export async function notifyWhatsApp(title: string, lines: string[]) {
  const apikey = process.env["CALLMEBOT_WHATSAPP_APIKEY"];
  if (!apikey) return;
  const phone = (process.env["WHATSAPP_TARGET_PHONE"] || DEFAULT_PHONE).replace(/[^0-9]/g, "");
  const text = [title, ...lines.filter(Boolean)].join("\n");
  try {
    const url =
      `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
    await fetch(url, { method: "GET" });
  } catch (e) {
    console.error("whatsapp notify failed", e);
  }
}

/** Sends the same alert to Discord and WhatsApp. */
export async function notifyAll(title: string, lines: string[], color?: number) {
  const { notifyDiscord } = await import("./discord.server");
  await Promise.all([notifyDiscord(title, lines, color), notifyWhatsApp(title, lines)]);
}

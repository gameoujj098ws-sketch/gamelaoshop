/** Server-only Discord webhook notifier. Silently no-ops when unconfigured. */
export async function notifyDiscord(title: string, lines: string[], color = 0xec4899) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Gamelao",
        embeds: [
          {
            title,
            color,
            description: lines.filter(Boolean).join("\n"),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.error("discord notify failed", e);
  }
}

export function formatKip(n: number | null | undefined): string {
  if (n == null) return "0";
  return new Intl.NumberFormat("en-US").format(n);
}

/** Full date-time, e.g. 28/07/2026 14:32 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Relative time in Lao, e.g. "5 ນາທີກ່ອນ" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "-";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "ຫາກໍ່ນີ້";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ນາທີກ່ອນ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ຊົ່ວໂມງກ່ອນ`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ມື້ກ່ອນ`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ເດືອນກ່ອນ`;
  return `${Math.floor(mo / 12)} ປີກ່ອນ`;
}

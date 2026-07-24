export function formatKip(n: number | null | undefined): string {
  if (n == null) return "0";
  return new Intl.NumberFormat("en-US").format(n);
}

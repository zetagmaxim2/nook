export const id = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const now = () => new Date().toISOString();
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseLocalDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (value: string, n: number) => {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
export const dayDiff = (from: string, to: string) =>
  Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86400000,
  );
export const formatDate = (
  value: string,
  opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) =>
  new Intl.DateTimeFormat(undefined, opts).format(
    parseLocalDate(value.slice(0, 10)),
  );
export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const countWords = (html: string) => {
  const text = (
    typeof DOMParser === "undefined"
      ? html.replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp|lt|gt|quot);/g, " ")
      : new DOMParser().parseFromString(html, "text/html").body.textContent ||
        ""
  )
    .normalize("NFC")
    .trim();
  if (!text) return 0;
  return text.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
};
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const money = (n: number) =>
  `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} DH`;
export function financeCalculation(
  amount: number,
  includeToday: boolean,
  date = new Date(),
) {
  const today = localDate(date);
  const end = localDate(new Date(date.getFullYear(), date.getMonth(), 28));
  if (date.getDate() > 28)
    return { ended: true, days: 0, start: today, end, target: 0 };
  const days = 28 - date.getDate() + (includeToday ? 1 : 0);
  const start = includeToday ? today : addDays(today, 1);
  return {
    ended: days <= 0,
    days,
    start,
    end,
    target: days > 0 ? amount / days : 0,
  };
}
export const downloadJson = (data: unknown, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

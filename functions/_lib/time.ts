const SAO_PAULO_OFFSET = "-03:00";

export function parseBrasiliaDateTime(value: unknown): number {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) return Number.NaN;
  const withSeconds = text.length === 16 ? `${text}:00` : text;
  return new Date(`${withSeconds}${SAO_PAULO_OFFSET}`).getTime();
}

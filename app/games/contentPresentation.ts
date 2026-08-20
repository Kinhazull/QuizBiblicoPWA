export function presentContentTitle(title: string | null | undefined, fallback: string) {
  const value = String(title ?? "").trim();
  if (!value) return fallback;
  return value
    .replace(/\s*[—-]\s*conjunto\s+\d+\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim() || fallback;
}

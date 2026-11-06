/** Only same-site paths, so a crafted link can't bounce people to another domain after sign-in. */
export function safeNext(v: unknown, fallback = "/account") {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

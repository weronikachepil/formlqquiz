export function safeRedirect(target, fallback = "/") {
  if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) return target;
  return fallback;
}

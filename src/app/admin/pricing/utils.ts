export const ADMIN_ROLES = ["MODERATOR", "CURATOR", "ADMIN"];

export function canViewPricingAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const ms = Date.now() - date.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function timeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "in <1m";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export function rateLimitTone(requestCount: number, maxPerWindow: number): "ok" | "warn" | "exceeded" {
  const ratio = requestCount / maxPerWindow;
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

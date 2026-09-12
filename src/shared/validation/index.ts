export const validators = {
  required(value: string, label = "This field") { return value.trim() ? "" : `${label} is required.`; },
  email(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "" : "Enter a valid email address."; },
  positive(value: string, label = "Value") { const number = Number(value); return Number.isFinite(number) && number > 0 ? "" : `${label} must be greater than 0.`; },
  url(value: string) { try { const parsed = new URL(value); return ["http:","https:"].includes(parsed.protocol) ? "" : "Use an http or https URL."; } catch { return "Enter a valid URL including https://"; } },
  slug(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim()) ? "" : "Use lowercase letters, numbers and hyphens only."; },
  semver(value: string) { return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value.trim()) ? "" : "Use semantic versioning such as 1.4.0 or 1.5.0-beta.1."; },
};
export function firstError(...messages: string[]) { return messages.find(Boolean) ?? ""; }

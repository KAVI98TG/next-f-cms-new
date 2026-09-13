export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
export function problem(status: number, code: string, detail: string, requestId: string) {
  return json({ ok: false, requestId, problem: { code, detail } }, status);
}
export function requestId(request: Request) {
  return request.headers.get("cf-ray") || request.headers.get("x-request-id") || crypto.randomUUID();
}
export function originAllowed(origin: string | null, allowed: string[]) {
  if (!origin) return true;
  return allowed.includes(origin);
}

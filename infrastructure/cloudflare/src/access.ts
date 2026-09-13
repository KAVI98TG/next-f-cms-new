import type { WorkerEnv } from "./env";

type AccessPayload = { aud?: string | string[]; email?: string; sub?: string; exp?: number; iat?: number; nbf?: number; iss?: string; type?: string };
type Jwk = { kid: string; kty: string; n: string; e: string; alg?: string; use?: string };
type JwksResponse = { keys: Jwk[] };
let cachedJwks: { expiresAt: number; value: JwksResponse } | undefined;

export class AccessVerificationError extends Error {
  constructor(public code: string, message: string, public status = 401) { super(message); }
}

const teamDomain = (value: string) => value.replace(/^https?:\/\//, "").replace(/\/$/, "");
const expectedIssuer = (env: WorkerEnv) => `https://${teamDomain(env.ACCESS_TEAM_DOMAIN)}`;
const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
const decodeJson = <T>(value: string): T => JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
async function getJwks(env: WorkerEnv) {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.value;
  const response = await fetch(`https://${teamDomain(env.ACCESS_TEAM_DOMAIN)}/cdn-cgi/access/certs`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new AccessVerificationError("ACCESS_JWKS_UNAVAILABLE", "Cloudflare Access signing keys are unavailable", 503);
  const value = await response.json() as JwksResponse;
  cachedJwks = { value, expiresAt: Date.now() + 5 * 60_000 };
  return value;
}
export async function verifyAccessAssertion(request: Request, env: WorkerEnv) {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new AccessVerificationError("UNAUTHENTICATED", "Missing Cloudflare Access assertion");
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new AccessVerificationError("UNAUTHENTICATED", "Malformed Cloudflare Access assertion");
  let header: { alg?: string; kid?: string }; let payload: AccessPayload;
  try { header = decodeJson<{ alg?: string; kid?: string }>(headerPart); payload = decodeJson<AccessPayload>(payloadPart); }
  catch { throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access assertion payload is invalid"); }
  if (header.alg !== "RS256" || !header.kid) throw new AccessVerificationError("UNAUTHENTICATED", "Unsupported Cloudflare Access JWT algorithm");
  const jwks = await getJwks(env); const jwk = jwks.keys.find((item) => item.kid === header.kid);
  if (!jwk) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access signing key not found");
  const key = await crypto.subtle.importKey("jwk", jwk as JsonWebKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(signaturePart), new TextEncoder().encode(`${headerPart}.${payloadPart}`));
  if (!valid) throw new AccessVerificationError("UNAUTHENTICATED", "Invalid Cloudflare Access JWT signature");
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access assertion expired");
  if (payload.iat && payload.iat > now + 60) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access assertion was issued in the future");
  if (payload.nbf && payload.nbf > now + 60) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access assertion is not active yet");
  if (payload.type !== "app") throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access application token is required");
  if (payload.iss !== expectedIssuer(env)) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access issuer mismatch");
  const audience = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!audience.includes(env.ACCESS_AUD)) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access audience mismatch");
  if (!payload.email || !payload.sub) throw new AccessVerificationError("UNAUTHENTICATED", "Cloudflare Access identity claims missing");
  return { subject: payload.sub, email: payload.email.toLowerCase(), assurance: "cloudflare-access" as const };
}

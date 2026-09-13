import type { WorkerEnv } from "./env";
export async function verifyTurnstile(token:string,request:Request,env:WorkerEnv){
  if(!token) return false;
  const body=new FormData(); body.set("secret",env.TURNSTILE_SECRET_KEY); body.set("response",token);
  const ip=request.headers.get("cf-connecting-ip"); if(ip) body.set("remoteip",ip);
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body});
  if(!response.ok) return false; const result=await response.json() as {success?:boolean}; return result.success===true;
}
export async function enforcePublicRateLimit(request:Request,env:WorkerEnv,route:string){
  const ip=request.headers.get("cf-connecting-ip")||"unknown"; const result=await env.PUBLIC_RATE_LIMITER.limit({key:`${route}:${ip}`}); return result.success;
}

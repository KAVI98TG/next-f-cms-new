import type { ApiResult, WorkspaceScope } from "../backend/types";
export type ProductionRequest = { operation:string; kind:"query"|"command"; input:unknown; workspaceScope?:WorkspaceScope; idempotencyKey?:string };
export class ProductionBackendClient {
  constructor(private baseUrl:string){}
  async execute<T>(request:ProductionRequest):Promise<ApiResult<T>>{
    if(!this.baseUrl) throw new Error("Production backend URL is not configured");
    if(request.kind==="command"&&!request.idempotencyKey) throw new Error("Production commands require an idempotency key");
    const requestId=crypto.randomUUID(); const correlationId=crypto.randomUUID();
    const response=await fetch(`${this.baseUrl}/v1/staff/${request.kind === "query" ? "queries" : "commands"}/${encodeURIComponent(request.operation)}`,{method:"POST",credentials:"include",headers:{"content-type":"application/json","x-request-id":requestId,"x-correlation-id":correlationId,...(request.idempotencyKey?{"idempotency-key":request.idempotencyKey}:{})},body:JSON.stringify({input:request.input,workspaceScope:request.workspaceScope})});
    let data:ApiResult<T>;
    try{data=await response.json() as ApiResult<T>}catch{throw new Error(`Production backend returned HTTP ${response.status} without a valid JSON response`)}
    if(!data||typeof data!=="object"||!("ok" in data)) throw new Error("Production backend returned an invalid response envelope");
    return data;
  }
}

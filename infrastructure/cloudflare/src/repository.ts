import type { D1DatabaseLike } from "./env";

export type DurableDocument = { namespace: string; id: string; organizationId?: string; workspaceId?: string; version: number; payload: unknown; createdAt: string; updatedAt: string };
export class D1DocumentRepository {
  constructor(private db: D1DatabaseLike) {}
  private map(row:any):DurableDocument { return { namespace: row.namespace, id: row.id, organizationId: row.organization_id ?? undefined, workspaceId: row.workspace_id ?? undefined, version: row.version, payload: JSON.parse(row.payload_json), createdAt: row.created_at, updatedAt: row.updated_at }; }
  async get(namespace: string, id: string): Promise<DurableDocument | undefined> {
    const row = await this.db.prepare("SELECT namespace,id,organization_id,workspace_id,version,payload_json,created_at,updated_at FROM app_documents WHERE namespace=? AND id=? AND deleted_at IS NULL").bind(namespace,id).first<any>();
    return row ? this.map(row) : undefined;
  }
  async list(namespace: string, scope?: { organizationId?: string; workspaceId?: string }) {
    const clauses=["namespace=?","deleted_at IS NULL"]; const values:unknown[]=[namespace];
    if(scope?.organizationId){clauses.push("organization_id=?");values.push(scope.organizationId)}
    if(scope?.workspaceId){clauses.push("workspace_id=?");values.push(scope.workspaceId)}
    const result=await this.db.prepare(`SELECT namespace,id,organization_id,workspace_id,version,payload_json,created_at,updated_at FROM app_documents WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC`).bind(...values).all<any>();
    return result.results.map((row)=>this.map(row));
  }
  async create(input: Omit<DurableDocument,"version"|"createdAt"|"updatedAt">) {
    const now=new Date().toISOString();
    const result=await this.db.prepare("INSERT INTO app_documents(namespace,id,organization_id,workspace_id,version,payload_json,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?)").bind(input.namespace,input.id,input.organizationId??null,input.workspaceId??null,JSON.stringify(input.payload),now,now).run();
    if(!result.success) throw new Error("D1 document create failed");
    return { ...input, version:1, createdAt:now, updatedAt:now };
  }
  async update(namespace:string,id:string,expectedVersion:number,payload:unknown){
    const now=new Date().toISOString();
    const result=await this.db.prepare("UPDATE app_documents SET payload_json=?,version=version+1,updated_at=? WHERE namespace=? AND id=? AND version=? AND deleted_at IS NULL").bind(JSON.stringify(payload),now,namespace,id,expectedVersion).run();
    if(!result.success) throw new Error("D1 document update failed");
    const current=await this.get(namespace,id); if(!current||current.version!==expectedVersion+1) throw new Error("Optimistic concurrency conflict"); return current;
  }
  async put(namespace:string,id:string,payload:unknown,options:{organizationId?:string;workspaceId?:string;expectedVersion?:number}={}){
    const current=await this.get(namespace,id);
    if(!current){
      if(options.expectedVersion!==undefined) throw new Error("Optimistic concurrency conflict");
      try { return await this.create({namespace,id,payload,organizationId:options.organizationId,workspaceId:options.workspaceId}); }
      catch (error) { if(await this.get(namespace,id)) throw new Error("Optimistic concurrency conflict"); throw error; }
    }
    if(options.expectedVersion===undefined||current.version!==options.expectedVersion) throw new Error("Optimistic concurrency conflict");
    return this.update(namespace,id,current.version,payload);
  }
  async remove(namespace:string,id:string,expectedVersion?:number){
    const current=await this.get(namespace,id); if(!current) return;
    if(expectedVersion===undefined||current.version!==expectedVersion) throw new Error("Optimistic concurrency conflict");
    const now=new Date().toISOString();
    const result=await this.db.prepare("UPDATE app_documents SET deleted_at=?,updated_at=?,version=version+1 WHERE namespace=? AND id=? AND version=? AND deleted_at IS NULL").bind(now,now,namespace,id,current.version).run();
    if(!result.success) throw new Error("D1 document delete failed");
    const stillPresent=await this.get(namespace,id); if(stillPresent) throw new Error("Optimistic concurrency conflict");
  }
}

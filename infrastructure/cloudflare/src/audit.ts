import type { D1DatabaseLike } from "./env";
export async function recordAudit(db:D1DatabaseLike,event:{id:string;action:string;principalKind:string;principalId:string;organizationId?:string;workspaceId?:string;targetType:string;targetId:string;outcome:string;requestId:string;correlationId:string;detail:string}){
  await db.prepare("INSERT INTO audit_events(id,action,principal_kind,principal_id,organization_id,workspace_id,target_type,target_id,outcome,request_id,correlation_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(event.id,event.action,event.principalKind,event.principalId,event.organizationId??null,event.workspaceId??null,event.targetType,event.targetId,event.outcome,event.requestId,event.correlationId,event.detail,new Date().toISOString()).run();
}

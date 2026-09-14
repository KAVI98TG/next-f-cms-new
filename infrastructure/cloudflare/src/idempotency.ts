import type { D1DatabaseLike } from "./env";
export class D1IdempotencyRepository {
  constructor(private db:D1DatabaseLike){}
  get(key:string){return this.db.prepare("SELECT * FROM idempotency_records WHERE key=?").bind(key).first<any>()}
  async claim(input:{key:string;commandName:string;principalFingerprint:string;requestHash:string;ttlSeconds:number}){
    const now=new Date(); const nowIso=now.toISOString(); const expiresAt=new Date(now.getTime()+input.ttlSeconds*1000).toISOString(); const claimToken=`claim:${crypto.randomUUID()}`;
    await this.db.prepare("DELETE FROM idempotency_records WHERE key=? AND expires_at<=?").bind(input.key,nowIso).run();
    await this.db.prepare("INSERT OR IGNORE INTO idempotency_records(key,command_name,principal_fingerprint,request_hash,state,response_reference,created_at,updated_at,expires_at) VALUES(?,?,?,?,\'claimed\',?,?,?,?)").bind(input.key,input.commandName,input.principalFingerprint,input.requestHash,claimToken,nowIso,nowIso,expiresAt).run();
    const existing=await this.db.prepare("SELECT * FROM idempotency_records WHERE key=?").bind(input.key).first<any>();
    if(!existing) throw new Error("Unable to claim idempotency key");
    const same=existing.command_name===input.commandName&&existing.principal_fingerprint===input.principalFingerprint&&existing.request_hash===input.requestHash;
    const inserted=existing.response_reference===claimToken&&same;
    return {outcome:inserted?"claimed":same?"replay":"conflict",record:existing} as const;
  }
  complete(key:string,responseReference:string){return this.db.prepare("UPDATE idempotency_records SET state=\'completed\',response_reference=?,updated_at=? WHERE key=?").bind(responseReference,new Date().toISOString(),key).run()}
  fail(key:string,failureCode:string){return this.db.prepare("UPDATE idempotency_records SET state=\'failed\',failure_code=?,updated_at=? WHERE key=?").bind(failureCode,new Date().toISOString(),key).run()}
}

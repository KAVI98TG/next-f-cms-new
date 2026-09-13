import { platformStore } from "../../platform/services/platformStore";
import { clientsRepository } from "../data/repositories/clientsRepository";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type PortalAccess = {
  id: string;
  clientId: string;
  email: string;
  status: "invited" | "active" | "suspended";
  lastInviteAt?: string;
  lastLoginAt?: string;
  createdAt: string;
};

const KEY = "nextf.v0.10.digital.portal-access";
const ago = (days:number) => new Date(Date.now()-days*86_400_000).toISOString();
const seed: PortalAccess[] = [
  {id:"portal_1",clientId:"client_1",email:"amal@example.com",status:"active",lastInviteAt:ago(200),lastLoginAt:ago(2),createdAt:ago(200)},
  {id:"portal_2",clientId:"client_2",email:"mihiri@example.com",status:"invited",lastInviteAt:ago(4),createdAt:ago(4)},
];
function read(){return readDurableValue(KEY,seed);}
function write(value:PortalAccess[]){const result=writeDurableValue(KEY,value);window.dispatchEvent(new CustomEvent("nextf:digital-admin",{detail:KEY}));return result;}
const uid=()=>`portal_${crypto.randomUUID()}`;
export const portalRepository={
  get:read,
  createOrInvite(clientId:string){
    const client=clientsRepository.getClients().find((c)=>c.id===clientId);if(!client)throw new Error("Client not found");
    const existing=read().find((p)=>p.clientId===clientId);
    if(existing){const rows=read().map((p)=>p.id===existing.id?{...p,status:"invited" as const,email:client.email,lastInviteAt:new Date().toISOString()}:p);write(rows);return rows.find((p)=>p.id===existing.id)!;}
    const row:PortalAccess={id:uid(),clientId,email:client.email,status:"invited",lastInviteAt:new Date().toISOString(),createdAt:new Date().toISOString()};write([row,...read()]);
    platformStore.addAudit("Admin","Client portal invited",client.company||client.name,"NEXT F Digital",client.email,"info");return row;
  },
  update(id:string,patch:Partial<PortalAccess>){const rows=read().map((p)=>p.id===id?{...p,...patch}:p);write(rows);return rows.find((p)=>p.id===id);},
};

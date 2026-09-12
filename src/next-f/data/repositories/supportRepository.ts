import { platformStore } from "../../../platform/services/platformStore";
import { activity, id, KEYS, read, seedTickets, sequentialNumber, write } from "../core";
import type { DigitalTicket } from "../types";
export const supportRepository={
 getTickets:()=>read(KEYS.tickets,seedTickets),
 addTicket(input:Pick<DigitalTicket,"clientId"|"projectId"|"siteId"|"subject"|"detail"|"priority">){ const rows=this.getTickets(); const timestamp=new Date().toISOString(); const row:DigitalTicket={...input,id:id("ticket"),number:sequentialNumber("NF-S-",rows,3000),status:"open",owner:"Admin",createdAt:timestamp,updatedAt:timestamp}; write(KEYS.tickets,[row,...rows]); activity("Support ticket opened",`${row.number} · ${row.subject}`,"ticket",row.id,row.priority==="urgent"?"warning":"info"); platformStore.addAudit("Admin","Support ticket created",row.number,"NEXT F Digital",row.subject,"info"); return row; },
 updateTicket(ticketId:string,patch:Partial<DigitalTicket>){ const rows=this.getTickets().map((row)=>row.id===ticketId?{...row,...patch,updatedAt:new Date().toISOString()}:row); write(KEYS.tickets,rows); return rows.find((row)=>row.id===ticketId)!; },
};

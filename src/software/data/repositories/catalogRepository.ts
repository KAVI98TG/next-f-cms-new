import { KEYS,pushActivity,read,seedEditions,seedProducts,uid,write } from "../core";
import type { SoftwareEdition,SoftwareProduct } from "../types";
export const softwareCatalogRepository={
 getProducts:()=>read(KEYS.products,seedProducts),getEditions:()=>read(KEYS.editions,seedEditions),
 addProduct(input:Pick<SoftwareProduct,"name"|"slug"|"type"|"description">){const rows=this.getProducts();const row:SoftwareProduct={...input,id:uid("swp"),status:"draft",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};write(KEYS.products,[row,...rows]);pushActivity("Software product created",row.name,"info");return row;},
 updateProduct(id:string,patch:Partial<SoftwareProduct>){const rows=this.getProducts().map((r)=>r.id===id?{...r,...patch,updatedAt:new Date().toISOString()}:r);write(KEYS.products,rows);return rows.find((r)=>r.id===id);},
 addEdition(input:Omit<SoftwareEdition,"id">){const row={...input,id:uid("swe")};write(KEYS.editions,[row,...this.getEditions()]);pushActivity("Edition created",`${this.getProducts().find((p)=>p.id===row.productId)?.name} · ${row.name}`);return row;},
 updateEdition(id:string,patch:Partial<SoftwareEdition>){const rows=this.getEditions().map((r)=>r.id===id?{...r,...patch}:r);write(KEYS.editions,rows);return rows.find((r)=>r.id===id);},
};

import { activity, KEYS, read, seedWorkflows, write } from "../core";
export const automationRepository={
 getWorkflows:()=>read(KEYS.workflows,seedWorkflows),
 toggleWorkflow(workflowId:string){ const rows=this.getWorkflows().map((row)=>row.id===workflowId?{...row,status:row.status==="active"?"paused" as const:"active" as const}:row); write(KEYS.workflows,rows); const updated=rows.find((row)=>row.id===workflowId)!; activity("Workflow updated",`${updated.name} is ${updated.status}.`,"workflow",updated.id,updated.status==="active"?"success":"neutral"); return updated; },
 runWorkflow(workflowId:string){ const timestamp=new Date().toISOString(); const rows=this.getWorkflows().map((row)=>row.id===workflowId?{...row,runs:row.runs+1,lastRunAt:timestamp}:row); write(KEYS.workflows,rows); const updated=rows.find((row)=>row.id===workflowId)!; activity("Workflow test run",updated.name,"workflow",updated.id,"info"); return updated; },
};

import { platformStore } from "../../../platform/services/platformStore";
import { activity, ahead, id, KEYS, read, seedApprovals, seedDeliverables, seedProjects, seedTasks, write } from "../core";
import type { ApprovalStatus, DigitalApproval, DigitalDeliverable, DigitalProject, DigitalTask, ProjectStatus } from "../types";
import { digitalSettingsRepository } from "../../settings/settingsRepository";

export const projectsRepository = {
  getProjects: () => read(KEYS.projects, seedProjects),
  getTasks: () => read(KEYS.tasks, seedTasks),
  getDeliverables: () => read(KEYS.deliverables, seedDeliverables),
  getApprovals: () => read(KEYS.approvals, seedApprovals),
  updateProject(idValue: string, patch: Partial<DigitalProject>) {
    const items = this.getProjects().map((item) => item.id === idValue ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    write(KEYS.projects, items); return items.find((item) => item.id === idValue)!;
  },
  setProjectProgress(projectId: string, progress: number) {
    const project = this.getProjects().find((item) => item.id === projectId); if (!project) throw new Error("Project not found");
    const clamped = Math.max(0, Math.min(100, progress));
    const nextStatus: ProjectStatus = clamped >= 100 ? (digitalSettingsRepository.get().requireClientApproval ? "awaiting_client" : "completed") : project.status === "planned" ? "active" : project.status;
    const updated = this.updateProject(projectId, { progress: clamped, status: nextStatus });
    activity("Project progress updated", `${project.name} is now ${clamped}% complete.`, "project", project.id, clamped >= 100 ? "warning" : "info"); return updated;
  },
  toggleMilestone(projectId: string, milestoneId: string) {
    const project = this.getProjects().find((item) => item.id === projectId); if (!project) throw new Error("Project not found");
    const milestones = project.milestones.map((item) => item.id === milestoneId ? { ...item, done: !item.done } : item);
    const completed = milestones.filter((item) => item.done).length;
    const progress = milestones.length ? Math.round((completed / milestones.length) * 100) : project.progress;
    const status: ProjectStatus = progress >= 100 ? (digitalSettingsRepository.get().requireClientApproval ? "awaiting_client" : "completed") : project.status === "planned" ? "active" : project.status;
    return this.updateProject(projectId, { milestones, progress, status });
  },
  completeProject(projectId: string) {
    const project = this.getProjects().find((item) => item.id === projectId); if (!project) throw new Error("Project not found");
    const updated = this.updateProject(projectId, { status: "completed", progress: 100, milestones: project.milestones.map((item) => ({ ...item, done: true })) });
    activity("Project completed", `${project.name} marked completed.`, "project", project.id, "success");
    platformStore.addAudit("Admin", "Project completed", project.name, "NEXT F Digital", "Delivery lifecycle completed locally.", "info"); return updated;
  },
  addTask(projectId: string, title: string, dueAt = ahead(7)) {
    const timestamp = new Date().toISOString(); const task: DigitalTask = { id: id("task"), projectId, title, status: "todo", owner: "Admin", dueAt, createdAt: timestamp, updatedAt: timestamp };
    write(KEYS.tasks, [task, ...this.getTasks()]); activity("Task created", title, "task", task.id, "info"); return task;
  },
  updateTask(taskId: string, patch: Partial<DigitalTask>) {
    const rows = this.getTasks().map((task) => task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task); write(KEYS.tasks, rows); return rows.find((task) => task.id === taskId)!;
  },
  addDeliverable(projectId: string, name: string, note = "") {
    const timestamp = new Date().toISOString(); const row: DigitalDeliverable = { id: id("del"), projectId, name, status: "draft", note, createdAt: timestamp, updatedAt: timestamp };
    write(KEYS.deliverables, [row, ...this.getDeliverables()]); activity("Deliverable created", name, "deliverable", row.id, "info"); return row;
  },
  updateDeliverable(deliverableId: string, patch: Partial<DigitalDeliverable>) {
    const rows = this.getDeliverables().map((row) => row.id === deliverableId ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row); write(KEYS.deliverables, rows); return rows.find((row) => row.id === deliverableId)!;
  },
  requestApproval(projectId: string, title: string) {
    const row: DigitalApproval = { id: id("app"), projectId, title, status: "pending", requestedAt: new Date().toISOString(), note: "" };
    write(KEYS.approvals, [row, ...this.getApprovals()]); activity("Client approval requested", title, "approval", row.id, "warning"); return row;
  },
  resolveApproval(approvalId: string, status: Exclude<ApprovalStatus, "pending">, note = "") {
    const rows = this.getApprovals().map((row) => row.id === approvalId ? { ...row, status, note, respondedAt: new Date().toISOString() } : row); write(KEYS.approvals, rows);
    const updated = rows.find((row) => row.id === approvalId)!; activity(status === "approved" ? "Client approval received" : "Changes requested", updated.title, "approval", updated.id, status === "approved" ? "success" : "warning"); return updated;
  },
};

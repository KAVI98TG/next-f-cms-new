import { platformStore } from "../../../platform/services/platformStore";
import { activity, id, KEYS, read, seedServices, write } from "../core";
import type { ServicePackage } from "../types";

export const servicesRepository = {
  getServices: () => read(KEYS.services, seedServices),
  addService(input: Omit<ServicePackage, "id" | "active" | "template"> & { template?: string[] }) {
    const services = this.getServices();
    const service: ServicePackage = { ...input, id: id("svc"), active: true, template: input.template?.filter(Boolean) ?? ["Discovery", "Delivery", "Client Approval"] };
    write(KEYS.services, [service, ...services]);
    activity("Service package created", `${service.name} · ${service.family}`, "service", service.id, "success");
    platformStore.addAudit("Admin", "Service created", service.name, "NEXT F Digital", `${service.family} service package added.`, "info");
    return service;
  },
};

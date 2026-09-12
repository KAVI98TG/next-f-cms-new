export * from "./types";
import { resetDigitalCore } from "./core";
import { servicesRepository } from "./repositories/servicesRepository";
import { clientsRepository } from "./repositories/clientsRepository";
import { salesRepository } from "./repositories/salesRepository";
import { billingRepository } from "./repositories/billingRepository";
import { projectsRepository } from "./repositories/projectsRepository";
import { sitesRepository } from "./repositories/sitesRepository";
import { supportRepository } from "./repositories/supportRepository";
import { automationRepository } from "./repositories/automationRepository";
import { activityRepository } from "./repositories/activityRepository";

/** Stable compatibility facade. Domain behavior lives in module repositories. */
export const digitalStore = {
  ...servicesRepository,
  ...clientsRepository,
  ...salesRepository,
  ...billingRepository,
  ...projectsRepository,
  ...sitesRepository,
  ...supportRepository,
  ...automationRepository,
  ...activityRepository,
  reset: resetDigitalCore,
};

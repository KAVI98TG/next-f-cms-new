export * from "./types";
import { resetSoftwareCore } from "./core";
import { softwareCatalogRepository } from "./repositories/catalogRepository";
import { releasesRepository } from "./repositories/releasesRepository";
import { commercialRepository } from "./repositories/commercialRepository";
import { licensingRepository } from "./repositories/licensingRepository";
import { softwareDeliveryRepository } from "./repositories/deliveryRepository";
import { softwareSettingsRepository } from "./repositories/settingsRepository";
import { softwareSupportRepository } from "./repositories/supportRepository";
/** Stable facade over product, commercial, licensing and delivery repositories. */
export const softwareStore={...softwareCatalogRepository,...releasesRepository,...commercialRepository,...licensingRepository,...softwareDeliveryRepository,...softwareSettingsRepository,...softwareSupportRepository,reset:resetSoftwareCore};

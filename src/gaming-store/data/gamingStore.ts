export * from "./types";
import { resetGamingCore } from "./core";
export { orderReconciliation } from "./core";
import { gamingSettingsRepository } from "./repositories/settingsRepository";
import { suppliersRepository } from "./repositories/suppliersRepository";
import { catalogRepository } from "./repositories/catalogRepository";
import { ordersRepository } from "./repositories/ordersRepository";
import { gamingSupportRepository } from "./repositories/supportRepository";

/** Stable facade over the reseller-domain repositories. */
export const gamingStore={...gamingSettingsRepository,...suppliersRepository,...catalogRepository,...ordersRepository,...gamingSupportRepository,reset:resetGamingCore};

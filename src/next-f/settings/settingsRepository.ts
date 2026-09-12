import { platformStore } from "../../platform/services/platformStore";

export type DigitalBusinessSettings = {
  proposalValidityDays: number;
  invoiceDueDays: number;
  renewalReminderDays: number;
  defaultGraceDays: number;
  requireClientApproval: boolean;
  portalEnabledByDefault: boolean;
};

const KEY = "nextf.v0.10.digital.settings";
export const defaultDigitalBusinessSettings: DigitalBusinessSettings = {
  proposalValidityDays: 14,
  invoiceDueDays: 7,
  renewalReminderDays: 14,
  defaultGraceDays: 7,
  requireClientApproval: true,
  portalEnabledByDefault: true,
};

function read(): DigitalBusinessSettings {
  if (typeof window === "undefined") return defaultDigitalBusinessSettings;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(defaultDigitalBusinessSettings));
      return defaultDigitalBusinessSettings;
    }
    return { ...defaultDigitalBusinessSettings, ...(JSON.parse(raw) as Partial<DigitalBusinessSettings>) };
  } catch {
    return defaultDigitalBusinessSettings;
  }
}

export const digitalSettingsRepository = {
  get: read,
  save(settings: DigitalBusinessSettings) {
    const normalized: DigitalBusinessSettings = {
      proposalValidityDays: Math.max(1, Math.round(settings.proposalValidityDays)),
      invoiceDueDays: Math.max(1, Math.round(settings.invoiceDueDays)),
      renewalReminderDays: Math.max(1, Math.round(settings.renewalReminderDays)),
      defaultGraceDays: Math.max(0, Math.round(settings.defaultGraceDays)),
      requireClientApproval: Boolean(settings.requireClientApproval),
      portalEnabledByDefault: Boolean(settings.portalEnabledByDefault),
    };
    window.localStorage.setItem(KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("nextf:digital-settings", { detail: KEY }));
    platformStore.addAudit("Admin", "Digital settings updated", "NEXT F Digital", "NEXT F Digital", "Business workflow defaults changed.", "info");
    return normalized;
  },
};

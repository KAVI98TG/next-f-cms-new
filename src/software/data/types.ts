
export type ProductStatus = "draft" | "active" | "archived";
export type ProductType = "plugin" | "addon" | "bundle";
export type BillingModel = "annual" | "monthly" | "one_time";
export type ReleaseChannel = "development" | "beta" | "release_candidate" | "stable";
export type ReleaseStatus = "draft" | "published" | "deprecated" | "withdrawn";
export type LicenseStatus = "active" | "grace" | "expired" | "suspended" | "revoked";
export type ActivationStatus = "active" | "deactivated";
export type SoftwareOrderStatus = "pending" | "paid" | "cancelled" | "refunded";
export type SubscriptionStatus = "active" | "past_due" | "cancelled";
export type DownloadStatus = "issued" | "downloaded" | "expired";
export type SupportStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type SupportPriority = "normal" | "high" | "urgent";

export type SoftwareProduct = { id:string; name:string; slug:string; type:ProductType; status:ProductStatus; description:string; createdAt:string; updatedAt:string };
export type SoftwareEdition = { id:string; productId:string; name:string; billingModel:BillingModel; price:number; currency:"USD"; activationLimit:number; updateMonths:number; supportMonths:number; active:boolean };
export type SoftwareRelease = { id:string; productId:string; version:string; channel:ReleaseChannel; status:ReleaseStatus; releasedAt?:string; minRuntime:string; compatibility:string; fileName:string; fileSizeMb:number; checksum:string; changelog:string; rollbackVersion?:string; createdAt:string; updatedAt:string };
export type SoftwareCustomer = { id:string; name:string; email:string; company:string; orders:number; lifetimeValue:number; createdAt:string; lastOrderAt?:string };
export type SoftwareOrder = { id:string; number:string; customerId:string; productId:string; editionId:string; amount:number; currency:"USD"; status:SoftwareOrderStatus; createdAt:string; paidAt?:string; refundedAt?:string };
export type SoftwareLicense = { id:string; key:string; customerId:string; productId:string; editionId:string; orderId?:string; status:LicenseStatus; activationLimit:number; issuedAt:string; expiresAt?:string; updateAccessUntil?:string; supportAccessUntil?:string };
export type SoftwareActivation = { id:string; licenseId:string; siteUrl:string; fingerprint:string; status:ActivationStatus; activatedAt:string; lastSeenAt:string };
export type SoftwareSubscription = { id:string; customerId:string; productId:string; editionId:string; licenseId:string; status:SubscriptionStatus; interval:"monthly"|"annual"; amount:number; currency:"USD"; nextRenewalAt:string; autoRenew:boolean; lastPaymentAt:string };
export type UpdateCheck = { id:string; licenseId:string; productId:string; currentVersion:string; availableVersion?:string; eligible:boolean; reason:string; checkedAt:string };
export type DownloadRecord = { id:string; customerId:string; productId:string; releaseId:string; licenseId:string; fileName:string; status:DownloadStatus; tokenHint:string; expiresAt:string; downloadCount:number; createdAt:string; lastDownloadAt?:string };
export type SoftwareSupportCase = { id:string; number:string; customerId:string; productId:string; licenseId?:string; subject:string; detail:string; priority:SupportPriority; status:SupportStatus; createdAt:string; updatedAt:string };
export type SoftwareSettings = { defaultLicenseDays:number; graceDays:number; offlineValidationDays:number; downloadTokenHours:number; maxDownloadAttempts:number; renewalReminderDays:number; defaultReleaseChannel:ReleaseChannel };
export type SoftwareActivity = { id:string; title:string; detail:string; tone:"neutral"|"info"|"success"|"warning"|"danger"; createdAt:string };


import { platformStore } from "../services/platformStore";
import { readDurableValue, writeDurableValue } from "../../services/production/durableStorage";

export type AccountVerificationState = "unverified" | "pending" | "verified";
export type AccountState = "active" | "locked" | "disabled" | "closed";
export type StaffIdentityLinkStatus = "active" | "disabled";

export type NextFAccount = {
  id: string;
  primaryEmail: string;
  displayName: string;
  verificationState: AccountVerificationState;
  state: AccountState;
  authReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffIdentityLink = {
  id: string;
  accountId: string;
  platformUserId: string;
  status: StaffIdentityLinkStatus;
  createdAt: string;
  updatedAt: string;
};

const KEYS = {
  accounts: "nextf.v0.13.platform.identity.accounts",
  staffLinks: "nextf.v0.13.platform.identity.staff-links",
};

const now = Date.now();
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

const accountSeed: NextFAccount[] = [
  {
    id: "acct_staff_admin",
    primaryEmail: "local@nextf.dev",
    displayName: "Admin",
    verificationState: "verified",
    state: "active",
    authReference: "local-development-session",
    createdAt: ago(300),
    updatedAt: ago(1),
  },
  {
    id: "acct_customer_1",
    primaryEmail: "owner@lankacrafthouse.example",
    displayName: "Lanka Craft House Owner",
    verificationState: "verified",
    state: "active",
    createdAt: ago(190),
    updatedAt: ago(5),
  },
];

const staffLinkSeed: StaffIdentityLink[] = [
  {
    id: "staff_identity_1",
    accountId: "acct_staff_admin",
    platformUserId: "usr_admin",
    status: "active",
    createdAt: ago(250),
    updatedAt: ago(1),
  },
];

function read<T>(key: string, seed: T): T { return readDurableValue(key, seed); }

function write<T>(key: string, value: T): T {
  const result = writeDurableValue(key, value);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:identity", { detail: key }));
  return result;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const identityStore = {
  getAccounts: () => read(KEYS.accounts, accountSeed),
  getStaffLinks: () => read(KEYS.staffLinks, staffLinkSeed),

  findAccountByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return this.getAccounts().find((account) => account.primaryEmail.toLowerCase() === normalized);
  },

  createAccount(input: { displayName: string; primaryEmail: string }) {
    const primaryEmail = normalizeEmail(input.primaryEmail);
    if (!primaryEmail || !primaryEmail.includes("@")) throw new Error("A valid primary email is required");
    const existing = this.findAccountByEmail(primaryEmail);
    if (existing) return existing;
    const timestamp = new Date().toISOString();
    const account: NextFAccount = {
      id: uid("acct"),
      displayName: input.displayName.trim() || primaryEmail,
      primaryEmail,
      verificationState: "unverified",
      state: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    write(KEYS.accounts, [account, ...this.getAccounts()]);
    platformStore.addAudit("Admin", "NEXT F Account record created", account.primaryEmail, "Platform", "Identity record created without staff roles, customer workspace access, or automatic email verification.", "info");
    return account;
  },

  updateAccount(id: string, patch: Partial<Pick<NextFAccount, "displayName" | "verificationState" | "state" | "authReference">>) {
    const rows = this.getAccounts().map((account) => account.id === id ? { ...account, ...patch, updatedAt: new Date().toISOString() } : account);
    write(KEYS.accounts, rows);
    const updated = rows.find((account) => account.id === id);
    if (updated) platformStore.addAudit("Admin", "NEXT F Account updated", updated.primaryEmail, "Platform", `Verification: ${updated.verificationState}; state: ${updated.state}.`, "info");
    return updated;
  },

  linkStaffIdentity(accountId: string, platformUserId: string) {
    const account = this.getAccounts().find((row) => row.id === accountId);
    const staffUser = platformStore.getUsers().find((row) => row.id === platformUserId);
    if (!account || !staffUser) throw new Error("Account or staff user not found");
    const existing = this.getStaffLinks().find((row) => row.accountId === accountId || row.platformUserId === platformUserId);
    if (existing) return existing;
    const timestamp = new Date().toISOString();
    const link: StaffIdentityLink = { id: uid("staff_identity"), accountId, platformUserId, status: "active", createdAt: timestamp, updatedAt: timestamp };
    write(KEYS.staffLinks, [link, ...this.getStaffLinks()]);
    platformStore.addAudit("Admin", "Staff identity linked", staffUser.email, "Platform", `NEXT F Account ${account.id} linked to staff principal ${staffUser.id}. Staff authorization remains role-based on the staff principal.`, "info");
    return link;
  },

  updateStaffLink(id: string, patch: Partial<Pick<StaffIdentityLink, "status">>) {
    const rows = this.getStaffLinks().map((link) => link.id === id ? { ...link, ...patch, updatedAt: new Date().toISOString() } : link);
    write(KEYS.staffLinks, rows);
    return rows.find((link) => link.id === id);
  },
};

import { useMemo, useState } from "react";
import { BadgeCheck, Link2, Plus, UserRoundCheck } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, MetricCard, Modal, PageToolbar, SectionHeader, TextInput, type DataTableColumn } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { customerAccessStore } from "../customer-access/customerAccessStore";
import { useCustomerAccessStore } from "../customer-access/useCustomerAccessStore";
import { platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";
import { identityStore, type NextFAccount } from "./identityStore";
import { useIdentityStore } from "./useIdentityStore";

const accountTone = (account: NextFAccount) => account.state !== "active" ? "danger" : account.verificationState === "verified" ? "success" : "warning";

export function IdentityPage() {
  const accounts = useIdentityStore(identityStore.getAccounts);
  const staffLinks = useIdentityStore(identityStore.getStaffLinks);
  const [staffUsers] = usePlatformStore(platformStore.getUsers);
  const memberships = useCustomerAccessStore(customerAccessStore.getMemberships);
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const filtered = useMemo(() => accounts.filter((account) => `${account.displayName} ${account.primaryEmail} ${account.verificationState} ${account.state}`.toLowerCase().includes(query.toLowerCase())), [accounts, query]);

  const columns: DataTableColumn<NextFAccount>[] = [
    { key: "identity", header: "NEXT F Account", render: (account) => <div className="entity-cell"><strong>{account.displayName}</strong><small>{account.primaryEmail}</small></div> },
    { key: "verification", header: "Verification", render: (account) => <Badge tone={accountTone(account)}>{account.verificationState}</Badge> },
    { key: "state", header: "Account state", render: (account) => <Badge tone={account.state === "active" ? "success" : account.state === "locked" ? "warning" : "danger"}>{account.state}</Badge> },
    { key: "staff", header: "Staff principal", render: (account) => { const link = staffLinks.find((item) => item.accountId === account.id && item.status === "active"); const user = link ? staffUsers.find((item) => item.id === link.platformUserId) : undefined; return user ? <div className="entity-cell"><strong>{user.name}</strong><small>{user.roleId}</small></div> : <span className="muted-cell">Not staff-linked</span>; } },
    { key: "memberships", header: "Customer memberships", render: (account) => <strong>{memberships.filter((item) => item.accountId === account.id && item.status !== "revoked").length}</strong> },
  ];

  const create = () => {
    try {
      const row = identityStore.createAccount({ displayName, primaryEmail: email });
      notify({ title: "NEXT F Account record created", description: `${row.primaryEmail} is unverified and has no automatic workspace or staff access.`, tone: "success" });
      setOpen(false); setDisplayName(""); setEmail("");
    } catch (error) {
      notify({ title: "Account not created", description: error instanceof Error ? error.message : "Check the identity details.", tone: "danger" });
    }
  };

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="NEXT F Accounts" description="Canonical NEXT F Account identity records." action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={15}/>Create identity record</Button>} />
    <div className="compact-metrics">
      <MetricCard label="NEXT F Accounts" value={String(accounts.length)} icon={UserRoundCheck}/>
      <MetricCard label="Staff links" value={String(staffLinks.filter((link) => link.status === "active").length)} icon={Link2}/>
      <MetricCard label="Customer memberships" value={String(memberships.filter((membership) => membership.status !== "revoked").length)} icon={BadgeCheck}/>
    </div>
    <Card className="architecture-callout"><strong>Identity does not grant access</strong><p>CMS access, workspace membership and website permissions are assigned separately.</p></Card>
    
    <Card className="table-card"><PageToolbar query={query} onQueryChange={setQuery} placeholder="Search NEXT F Accounts…"/><DataTable rows={filtered} columns={columns} getKey={(account) => account.id} empty="No NEXT F Accounts match this search."/></Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Create NEXT F Account identity record" description="Local product-model action only. The production identity provider will own registration, verification, recovery, and authentication references." footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={create}>Create unverified identity</Button></>}>
      <div className="form-grid form-grid--two"><FormField label="Display name" required><TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)}/></FormField><FormField label="Primary email" required><TextInput value={email} onChange={(event) => setEmail(event.target.value.toLowerCase())}/></FormField></div>
    </Modal>
  </div>;
}

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, ShieldCheck, UserCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, DataTable, FormField, Modal, PageToolbar, SectionHeader, SelectInput, TextInput, type DataTableColumn } from "../../shared/components";
import { useToast } from "../../shared/feedback/ToastProvider";
import { firstError, validators } from "../../shared/validation";
import { platformStore, type PlatformUser, type UserStatus } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";

const formatRelative = (value: string) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
};

export function UsersPage() {
  const reader = () => platformStore.getUsers();
  const [users] = usePlatformStore(reader);
  const roles = platformStore.getRoles();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [open, setOpen] = useState(false);
  const [pendingStatusUser, setPendingStatusUser] = useState<PlatformUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[1]?.id ?? roles[0]?.id ?? "");
  const [attempted, setAttempted] = useState(false);

  const filtered = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || user.status === status;
    return matchesQuery && matchesStatus;
  }), [users, query, status]);

  const nameError = attempted ? validators.required(name, "Name") : "";
  const emailError = attempted ? firstError(validators.required(email, "Email"), email.trim() ? validators.email(email) : "", users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase()) ? "A staff account with this email already exists." : "") : "";
  const roleError = attempted ? validators.required(roleId, "Role") : "";

  const columns: DataTableColumn<PlatformUser>[] = [
    { key: "user", header: "User", render: (user) => <div className="record-primary"><span className="record-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div> },
    { key: "role", header: "Role", render: (user) => roles.find((role) => role.id === user.roleId)?.name ?? "Unknown" },
    { key: "status", header: "Status", render: (user) => <Badge tone={user.status === "active" ? "success" : user.status === "invited" ? "info" : "danger"}>{user.status}</Badge> },
    { key: "activity", header: "Last active", render: (user) => <span className="muted-cell">{formatRelative(user.lastActive)}</span> },
    { key: "actions", header: "", render: (user) => <button className="table-action" aria-label={`Change status for ${user.name}`} onClick={() => setPendingStatusUser(user)}><MoreHorizontal size={17}/></button> },
  ];

  const create = () => {
    setAttempted(true);
    if (nameError || emailError || roleError || !name.trim() || !email.trim() || !roleId) return;
    platformStore.addUser({ name: name.trim(), email: email.trim(), roleId });
    notify({ title:"Invitation created", description:`${email.trim()} was added to the local staff directory.`, tone:"success" });
    setName(""); setEmail(""); setAttempted(false); setOpen(false);
  };

  const applyStatus = () => {
    if (!pendingStatusUser) return;
    const next: UserStatus = pendingStatusUser.status === "active" ? "suspended" : "active";
    platformStore.updateUser(pendingStatusUser.id, { status: next });
    platformStore.addAudit("Admin", `${next === "active" ? "Activated" : "Suspended"} user`, pendingStatusUser.email, "Platform", `${pendingStatusUser.name} status changed to ${next}.`, next === "active" ? "info" : "warning");
    notify({ title:next === "active" ? "User activated" : "User suspended", description:`${pendingStatusUser.name} is now ${next}.`, tone:next === "active" ? "success" : "info" });
  };

  const active = users.filter((user) => user.status === "active").length;
  const invited = users.filter((user) => user.status === "invited").length;

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Users" description="Manage staff access to the NEXT F CMS without mixing customer accounts into the admin identity layer." action={<Button variant="primary" onClick={() => { setAttempted(false); setOpen(true); }}><Plus size={16}/>Invite user</Button>} />
    <div className="compact-metrics">
      <Card><span><UsersRound size={17}/>Total users</span><strong>{users.length}</strong></Card>
      <Card><span><UserCheck size={17}/>Active</span><strong>{active}</strong></Card>
      <Card><span><UserRoundPlus size={17}/>Invited</span><strong>{invited}</strong></Card>
      <Card><span><ShieldCheck size={17}/>Roles</span><strong>{roles.length}</strong></Card>
    </div>
    <Card className="table-card">
      <PageToolbar query={query} onQueryChange={setQuery} placeholder="Search users by name or email">
        <SelectInput value={status} onChange={(event) => setStatus(event.target.value as "all" | UserStatus)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option>
        </SelectInput>
      </PageToolbar>
      <DataTable columns={columns} rows={filtered} getKey={(user) => user.id} empty="No users match this filter." />
    </Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Invite admin user" description="Creates a browser-persistent development record. Production invitations will be connected later." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={create}>Create invitation</Button></>}>
      <div className="form-grid">
        <FormField label="Name" required error={nameError}><TextInput aria-invalid={!!nameError} value={name} onChange={(event) => setName(event.target.value)} placeholder="Team member name"/></FormField>
        <FormField label="Email" required error={emailError}><TextInput aria-invalid={!!emailError} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com"/></FormField>
        <FormField label="Role" required error={roleError}><SelectInput aria-invalid={!!roleError} value={roleId} onChange={(event) => setRoleId(event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectInput></FormField>
      </div>
    </Modal>
    <ConfirmDialog open={!!pendingStatusUser} onClose={() => setPendingStatusUser(null)} title={pendingStatusUser?.status === "active" ? "Suspend staff access?" : "Activate staff access?"} description={pendingStatusUser ? `${pendingStatusUser.name} (${pendingStatusUser.email}) will be ${pendingStatusUser.status === "active" ? "blocked from normal CMS access" : "restored to active access"}.` : ""} confirmLabel={pendingStatusUser?.status === "active" ? "Suspend user" : "Activate user"} danger={pendingStatusUser?.status === "active"} onConfirm={applyStatus}/>
  </div>;
}

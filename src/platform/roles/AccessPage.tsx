import { useMemo, useState } from "react";
import { Check, KeyRound, LockKeyhole, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { Badge, Button, Card, FormField, Modal, SectionHeader, TextInput, Toggle } from "../../shared/components";
import { useSession } from "../../app/auth/SessionProvider";
import { platformPermissionCatalog, platformStore } from "../services/platformStore";
import { usePlatformStore } from "../shared/usePlatformStore";

export function AccessPage() {
  const rolesReader = () => platformStore.getRoles();
  const usersReader = () => platformStore.getUsers();
  const [roles] = usePlatformStore(rolesReader);
  const [users] = usePlatformStore(usersReader);
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const { user: sessionUser, assumeUser } = useSession();
  const selected = useMemo(() => roles.find((role) => role.id === selectedId) ?? roles[0], [roles, selectedId]);

  const memberCount = (roleId: string) => users.filter((user) => user.roleId === roleId).length;

  const togglePermission = (permission: string, enabled: boolean) => {
    if (!selected || selected.system) return;
    const domain = permission.split(".")[0];
    const readPermission = `${domain}.read`;
    const permissions = enabled
      ? Array.from(new Set([...selected.permissions, permission, ...(permission.endsWith(".read") ? [] : [readPermission])]))
      : permission.endsWith(".read")
        ? selected.permissions.filter((item) => !item.startsWith(`${domain}.`))
        : selected.permissions.filter((item) => item !== permission);
    platformStore.updateRole(selected.id, { permissions });
    platformStore.addAudit("Admin", "Role permissions changed", selected.name, "Platform", `${permission} ${enabled ? "granted" : "removed"}.`, "info");
  };

  const createRole = () => {
    if (!roleName.trim()) return;
    const role = platformStore.addRole(roleName.trim(), roleDescription.trim() || "Custom NEXT F CMS permission group.");
    setSelectedId(role.id);
    setRoleName("");
    setRoleDescription("");
    setOpen(false);
  };

  return <div className="page">
    <SectionHeader eyebrow="Platform" title="Roles & permissions" description="Domain-scoped access control keeps Digital, Gaming Store, Software and Platform responsibilities separated." action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16}/>New role</Button>} />
    <Card className="permission-preview"><div><span className="section-header__eyebrow">Local permission preview</span><strong>Active session: {sessionUser.name} · {sessionUser.role}</strong><small>Switch between active staff accounts to test route and navigation enforcement before production authentication exists.</small></div><div className="table-actions">{users.filter((item)=>item.status==="active").map((item)=><Button key={item.id} variant={sessionUser.id===item.id?"primary":"ghost"} onClick={()=>assumeUser(item.id)}>{item.name}</Button>)}</div></Card>
    <div className="access-layout">
      <Card className="role-list-card">
        <div className="card-heading"><span><UsersRound size={18}/></span><div><strong>Roles</strong><small>{roles.length} permission groups</small></div></div>
        <div className="role-list">{roles.map((role) => <button key={role.id} onClick={() => setSelectedId(role.id)} className={`role-list__item ${selected?.id === role.id ? "is-active" : ""}`}><span className="role-list__icon">{role.system ? <ShieldCheck size={17}/> : <KeyRound size={17}/>}</span><span><strong>{role.name}</strong><small>{memberCount(role.id)} member{memberCount(role.id) === 1 ? "" : "s"}</small></span>{role.system && <Badge tone="info">system</Badge>}</button>)}</div>
      </Card>
      <Card className="permission-card">
        {selected && <>
          <div className="permission-card__header"><div><span className="section-header__eyebrow">Permission policy</span><h3>{selected.name}</h3><p>{selected.description}</p></div>{selected.system && <Badge tone="success"><LockKeyhole size={12}/> Protected</Badge>}</div>
          <div className="permission-groups">{platformPermissionCatalog.map((group) => <section key={group.group} className="permission-group"><header><strong>{group.group}</strong><small>{group.permissions.filter((permission) => selected.permissions.includes(permission)).length}/{group.permissions.length} enabled</small></header><div>{group.permissions.map((permission) => {
            const enabled = selected.permissions.includes(permission);
            return <div className="permission-row" key={permission}><span><span className={`permission-check ${enabled ? "is-on" : ""}`}>{enabled && <Check size={12}/>}</span><span><strong>{permission}</strong><small>{permission.endsWith(".read") ? "View module data" : "Perform protected operations"}</small></span></span><Toggle checked={enabled} onChange={(value) => togglePermission(permission, value)} /></div>;
          })}</div></section>)}</div>
          {selected.system && <div className="inline-notice"><ShieldCheck size={17}/><span><strong>Super Admin is protected.</strong><small>Its permissions are fixed during the local development stage.</small></span></div>}
        </>}
      </Card>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Create role" description="Create a domain-scoped permission group for NEXT F staff." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={createRole}>Create role</Button></>}>
      <div className="form-grid">
        <FormField label="Role name"><TextInput value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Example: Finance"/></FormField>
        <FormField label="Description"><TextInput value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="What this role is responsible for"/></FormField>
      </div>
    </Modal>
  </div>;
}

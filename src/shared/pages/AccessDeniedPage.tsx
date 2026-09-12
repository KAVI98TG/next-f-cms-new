import { ShieldAlert } from "lucide-react";
import type { Permission } from "../../app/auth/types";
import { useRouter } from "../../app/router/RouterProvider";
import { useSession } from "../../app/auth/SessionProvider";
import { Button, Card } from "../components";

export function AccessDeniedPage({ permission }: { permission: Permission }) {
  const { navigate } = useRouter();
  const { mode, assumeUser } = useSession();
  return <div className="page page--center"><Card className="not-found state-panel"><ShieldAlert size={30}/><h1>Access restricted</h1><p>Your current role does not include <code>{permission}</code>. This route is protected by the CMS permission layer.</p><div className="table-actions"><Button variant="primary" onClick={()=>navigate("/platform/dashboard")}>Return to Platform</Button>{mode==="local-development"&&<Button onClick={()=>{assumeUser("usr_admin");navigate("/platform/access");}}>Restore Super Admin preview</Button>}</div></Card></div>;
}

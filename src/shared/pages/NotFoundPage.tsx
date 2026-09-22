import { CircleHelp } from "lucide-react";
import { Button, Card } from "../components";
import { useRouter } from "../../app/router/RouterProvider";

export function NotFoundPage() { const { navigate } = useRouter(); return <div className="page page--center"><Card className="not-found"><CircleHelp size={28}/><h1>Page not found</h1><p>This route is not available in the CMS.</p><Button variant="primary" onClick={() => navigate("/next-f/dashboard")}>Return to dashboard</Button></Card></div>; }

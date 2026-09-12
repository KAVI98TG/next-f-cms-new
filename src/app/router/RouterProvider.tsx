import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const BASE = "/admin";

type RouterContextValue = {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function normalizeBrowserPath() {
  const value = window.location.pathname.startsWith(BASE)
    ? window.location.pathname.slice(BASE.length)
    : window.location.pathname;
  return value === "" || value === "/" ? "/next-f/dashboard" : value.replace(/\/$/, "");
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(normalizeBrowserPath);

  useEffect(() => {
    const onPopState = () => setPathname(normalizeBrowserPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = `${BASE}${normalized}`;
    if (options?.replace) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
    setPathname(normalized);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRouter must be used inside RouterProvider");
  return value;
}

import { useEffect, useState } from "react";

export function useIdentityStore<T>(reader: () => T): T {
  const [value, setValue] = useState(reader);
  useEffect(() => {
    const refresh = () => setValue(reader());
    window.addEventListener("nextf:identity", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nextf:identity", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, [reader]);
  return value;
}

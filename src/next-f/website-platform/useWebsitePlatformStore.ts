import { useEffect, useState } from "react";

export function useWebsitePlatformStore<T>(reader: () => T): T {
  const [value, setValue] = useState(reader);
  useEffect(() => {
    const refresh = () => setValue(reader());
    window.addEventListener("nextf:website-platform", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nextf:website-platform", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, [reader]);
  return value;
}

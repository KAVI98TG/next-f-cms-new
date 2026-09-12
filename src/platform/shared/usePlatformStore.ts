import { useCallback, useEffect, useState } from "react";

export function usePlatformStore<T>(reader: () => T) {
  const [value, setValue] = useState<T>(() => reader());

  const refresh = useCallback(() => setValue(reader()), [reader]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("nextf:platform-store", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("nextf:platform-store", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return [value, refresh] as const;
}

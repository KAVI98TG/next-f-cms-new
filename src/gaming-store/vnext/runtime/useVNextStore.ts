import { useEffect, useState } from "react";

export function useVNextStore<T>(reader: () => T) {
  const [value, setValue] = useState(reader);
  useEffect(() => { const refresh = () => setValue(reader()); window.addEventListener("nextf:gaming-vnext", refresh); return () => window.removeEventListener("nextf:gaming-vnext", refresh); }, [reader]);
  return value;
}

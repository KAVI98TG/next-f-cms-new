import { useEffect, useState } from "react";

export function useHelpCenter<T>(selector:()=>T) {
  const [value,setValue]=useState(selector);
  useEffect(()=>{const refresh=()=>setValue(selector());window.addEventListener("nextf:help-center",refresh);window.addEventListener("nextf:platform-store",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("nextf:help-center",refresh);window.removeEventListener("nextf:platform-store",refresh);window.removeEventListener("storage",refresh);};},[selector]);
  return value;
}

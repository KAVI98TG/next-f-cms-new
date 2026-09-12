import { useEffect, useState } from "react";
import { getOperationsNotifications } from "./operationsCenter";

export function useOperationsCenter() {
  const [items, setItems] = useState(getOperationsNotifications);
  useEffect(() => {
    const refresh = () => setItems(getOperationsNotifications());
    const events = ["storage", "nextf:platform-store", "nextf:digital-store", "nextf:gaming-store", "nextf:software-store", "nextf:operations-center"];
    events.forEach((name) => window.addEventListener(name, refresh as EventListener));
    return () => events.forEach((name) => window.removeEventListener(name, refresh as EventListener));
  }, []);
  return items;
}

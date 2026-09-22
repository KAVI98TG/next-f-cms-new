import { useEffect, useRef } from "react";

const focusables = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function getFocusableNodes(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(focusables)).filter((node) => {
    if (node.getAttribute("aria-hidden") === "true") return false;
    if (node.hasAttribute("hidden")) return false;
    return true;
  });
}

export function useOverlayFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !ref.current) return;

    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const timer = requestAnimationFrame(() => {
      const nodes = getFocusableNodes(root);
      const preferred = nodes.find((node) => node.hasAttribute("data-overlay-autofocus"))
        ?? nodes.find((node) => !node.hasAttribute("data-overlay-close"))
        ?? nodes[0];
      (preferred ?? root).focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = getFocusableNodes(root);
      if (!nodes.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  return ref;
}

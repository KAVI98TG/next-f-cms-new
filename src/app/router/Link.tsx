import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useRouter } from "./RouterProvider";

export function Link({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate } = useRouter();
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href.startsWith("/")) {
      event.preventDefault();
      navigate(href);
    }
  }
  return <a href={`/admin${href}`} onClick={handleClick} {...props} />;
}

import type { AnchorHTMLAttributes } from "react";

/**
 * A plain link between Windowsill's two screens (notes "/" and Focus Mode "/focus").
 *
 * Why not Next's <Link>? It fetches the next screen's data from the server,
 * which fails offline. A normal link does a full page load instead, and the
 * service worker answers that from its cache, so it works with no internet.
 */
export function AppLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}

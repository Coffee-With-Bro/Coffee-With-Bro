import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { navigate } from "../lib/useRoute";

type LinkProps = ComponentPropsWithoutRef<"a"> & { to: string };

/**
 * An anchor that navigates in-page instead of reloading the document.
 *
 * It stays a real <a href> so the link is focusable, shows its destination in
 * the status bar, and can be opened in a new tab - we only take over the plain
 * left-click, and let the browser handle everything else itself.
 */
export function Link({ to, onClick, children, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    const wantsNewTab =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      wantsNewTab ||
      rest.target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <a {...rest} href={to} onClick={handleClick}>
      {children}
    </a>
  );
}

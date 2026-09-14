import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { navigate } from "../lib/useRoute";

type LinkProps = ComponentPropsWithoutRef<"a"> & { to: string };

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

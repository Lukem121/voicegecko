import type { ReactNode } from "react";
import { AuthUIProvider as BetterAuthUIProvider } from "@daveyplate/better-auth-ui";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/auth/client";

interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

const NavLink = (props: NavLinkProps) => {
  return (
    <Link to={props.href} className={props.className}>
      {props.children}
    </Link>
  );
};

export function AuthUIProvider({ children }: { children: ReactNode }) {
  const _navigate = useNavigate();
  const navigate = (path: string) => void _navigate({ to: path });

  return (
    <BetterAuthUIProvider
      authClient={authClient}
      navigate={navigate}
      Link={NavLink}
    >
      {children}
    </BetterAuthUIProvider>
  );
}

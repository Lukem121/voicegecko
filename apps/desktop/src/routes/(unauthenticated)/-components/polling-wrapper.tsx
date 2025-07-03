import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { authClient } from "~/auth/client";
import { usePolling } from "../-hooks/use-polling-refresh";

const POLL_INTERVAL = 5000;

interface PollingAuthWrapperProps {
  readonly children: ReactNode;
}

export default function PollingAuthWrapper({
  children,
}: PollingAuthWrapperProps) {
  const router = useRouter();
  const auth = authClient.useSession();

  useEffect(() => {
    if (auth.data?.session !== undefined) {
      console.log("Navigating to / from polling wrapper");
      void router.navigate({ to: "/" });
    }
  }, [auth.data?.session, router]);

  const refreshSession = () => {
    auth.refetch();
  };

  usePolling(refreshSession, POLL_INTERVAL);

  return children;
}

import { signInSocial } from "@daveyplate/better-auth-tauri";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@acme/ui/components/button";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/auth/sign-in")({
  component: () => <SignIn />,
});

const SignIn = () => {
  const handleSignIn = async () => {
    await signInSocial({
      authClient,
      provider: "discord",
      callbackURL: "/",
    });
  };

  return (
    <>
      <main className="container h-screen py-16">
        <Button onClick={handleSignIn}>Sign in with Discord</Button>
      </main>
    </>
  );
};

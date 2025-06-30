import { signInSocial } from "@daveyplate/better-auth-tauri";
import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/")({
  component: () => <Home />,
});

const Home = () => {
  const handleClick = async () => {
    const res = await signInSocial({
      authClient,
      provider: "discord",
      callbackURL: "/",
    });

    console.log("signInSocial result", res);
  };

  const {
    data: session,
    isPending, //loading state
    error, //error object
    refetch, //refetch the session
  } = authClient.useSession();

  return (
    <>
      <main className="container h-screen py-16">
        <button onClick={handleClick}>Sign in with Discord</button>
        <br />
        <button onClick={() => refetch()}>Refetch</button>
        <br />
        {/* Display session data */}
        <pre>{JSON.stringify({ session, isPending, error }, null, 2)}</pre>
      </main>
    </>
  );
};

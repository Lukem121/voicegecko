import { signInSocial } from "@daveyplate/better-auth-tauri";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

import { authClient } from "~/auth/client";
import { trpc } from "~/trpc";

export const Route = createFileRoute("/")({
  component: () => <Home />,
});

const Home = () => {
  const secretMessage = useMutation(
    trpc.auth.getSecretMessage.mutationOptions({
      onSuccess: (data) => {
        console.log("secretMessage", data);
      },
      onError: (error) => {
        console.error("error", error);
      },
    }),
  );

  const handleClick = async () => {
    const res = await signInSocial({
      authClient,
      provider: "discord",
      callbackURL: "/",
    });

    console.log("signInSocial result", res);
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      console.log("Successfully signed out");
    } catch (error) {
      console.error("Sign out error:", error);
    }
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
        {session ? (
          <div>
            <button onClick={handleSignOut}>Sign Out</button>
            <br />
            <p>Welcome back! You are signed in.</p>
          </div>
        ) : (
          <button onClick={handleClick}>Sign in with Discord</button>
        )}
        <br />
        <button onClick={() => refetch()}>Refetch</button>
        <br />
        <button onClick={() => secretMessage.mutate({ message: "Hello" })}>
          Refetch secret message
        </button>
        <br />
        {/* Display session data */}
        <pre>{JSON.stringify({ session, isPending, error }, null, 2)}</pre>
        <pre>{JSON.stringify(secretMessage.data, null, 2)}</pre>
      </main>
    </>
  );
};

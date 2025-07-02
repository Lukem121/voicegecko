import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@acme/ui/components/button";

import { useSignOut, useUser } from "~/hooks/auth";
import { useTRPC } from "~/trpc";

const Home = () => {
  const trpc = useTRPC();
  const user = useUser();
  const signOut = useSignOut();

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

  return (
    <main className="container h-screen py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">Welcome to Your App!</h1>
          <p className="mb-6 text-gray-600">
            You are successfully authenticated and can access the full
            application.
          </p>
        </div>

        {/* User Info Section */}
        <div className="rounded-lg bg-gray-50 p-6 text-black">
          <h2 className="mb-4 text-xl font-semibold">User Information</h2>
          {user ? (
            <div className="space-y-2">
              <p>
                <strong>Name:</strong> {user.name}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>User ID:</strong> {user.id}
              </p>
              <p>
                <strong>Email Verified:</strong>{" "}
                {user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          ) : (
            <p>Loading user information...</p>
          )}
        </div>

        {/* Actions Section */}
        <div className="space-y-4">
          <div>
            <Button
              onClick={() =>
                secretMessage.mutate({
                  message: "Hello from authenticated user!",
                })
              }
              disabled={secretMessage.isPending}
            >
              {secretMessage.isPending ? "Loading..." : "Test Protected API"}
            </Button>

            {secretMessage.data && (
              <div className="mt-2 rounded border border-green-200 bg-green-50 p-3">
                <strong>API Response:</strong>{" "}
                {JSON.stringify(secretMessage.data, null, 2)}
              </div>
            )}

            {secretMessage.error && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 p-3">
                <strong>API Error:</strong> {secretMessage.error.message}
              </div>
            )}
          </div>

          <Button onClick={signOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

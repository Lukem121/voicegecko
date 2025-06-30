"use client";

import { useMutation } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export default function Test() {
  const trpc = useTRPC();

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
    <div>
      <button onClick={() => secretMessage.mutate({ message: "Hello" })}>
        Get Secret Message
      </button>
      <br />
      <pre>{JSON.stringify(secretMessage.data, null, 2)}</pre>
    </div>
  );
}

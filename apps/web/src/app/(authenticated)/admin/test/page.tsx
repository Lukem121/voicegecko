'use client';

import { Button } from '@acme/ui/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';

export default function TestPage() {
  const trpc = useTRPC();

  const options = trpc.test.sendAllEmailTemplates.mutationOptions();
  const mutation = useMutation(options);

  return (
    <div className="mx-auto max-w-6xl py-24">
      <Button onClick={() => mutation.mutate()}>Test</Button>
      <pre>{JSON.stringify(mutation.data, null, 2)}</pre>
    </div>
  );
}

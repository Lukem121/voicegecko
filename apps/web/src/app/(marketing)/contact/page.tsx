'use client';

import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@acme/ui/components/ui/form';
import { Input } from '@acme/ui/components/ui/input';
import { Textarea } from '@acme/ui/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email'),
  topic: z
    .string()
    .min(2, 'Please enter a topic')
    .max(100, 'Keep it under 100 characters'),
  message: z.string().min(10, 'Please share a bit more detail'),
});

export default function ContactPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', topic: '', message: '' },
    mode: 'onTouched',
  });
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    // Simulate submission
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        <h1 className="font-bold text-4xl tracking-tight md:text-5xl">
          Contact us
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We read every message. Tell us what you’re working on and how we can
          help.
        </p>
      </header>

      <Card className="mx-auto mt-10 max-w-2xl p-6">
        {submitted ? (
          <div>
            <p className="font-medium">Thanks for reaching out.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              We’ll get back to you soon.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="email"
                        placeholder="you@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Partnerships, feedback, feature request…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="How can we help?"
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button className="w-full" type="submit">
                  Send message
                </Button>
              </div>
            </form>
          </Form>
        )}
      </Card>
    </main>
  );
}

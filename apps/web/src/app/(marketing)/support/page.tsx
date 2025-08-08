'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@acme/ui/components/ui/accordion';
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
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(3, 'Please add a subject'),
  details: z.string().min(10, 'Share a bit more detail'),
});

export default function SupportPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', subject: '', details: '' },
  });
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="font-bold text-4xl tracking-tight md:text-5xl">
          Support
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We’re here to help you move faster. Browse common questions or contact
          us.
        </p>
      </header>

      <section className="mt-10 grid gap-10 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-xl">Contact support</h2>
          {submitted ? (
            <p className="mt-2 text-muted-foreground">
              Thanks—your message is in. We’ll reply soon.
            </p>
          ) : (
            <Form {...form}>
              <form
                className="mt-4 grid gap-3"
                onSubmit={form.handleSubmit(onSubmit)}
              >
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Billing, account access, bug…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What’s happening?"
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-1">
                  <Button className="w-full" type="submit">
                    Send
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </Card>

        <div>
          <h2 className="font-semibold text-xl">Common questions</h2>
          <Accordion className="mt-4" collapsible type="single">
            <AccordionItem value="a1">
              <AccordionTrigger>
                Where do I download the desktop app?
              </AccordionTrigger>
              <AccordionContent>
                From the homepage, use the download button. We detect your OS
                and give you the right installer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="a2">
              <AccordionTrigger>
                How does the weekly word allowance work?
              </AccordionTrigger>
              <AccordionContent>
                On Basic, your word count resets every Monday at 00:00 UTC.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="a3">
              <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
              <AccordionContent>
                Yes. Manage your plan from Settings → Billing. Pro has a 30‑day
                money‑back guarantee.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </main>
  );
}

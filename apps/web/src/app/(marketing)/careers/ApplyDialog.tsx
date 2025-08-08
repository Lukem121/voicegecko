'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@acme/ui/components/ui/dialog';
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
import type { Role } from './data';

const applySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  portfolio: z.string().url().optional(),
  resume: z.string().url().optional(),
  message: z.string().min(10),
});

export function ApplyDialog({ role }: { role: Role }) {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<z.infer<typeof applySchema>>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: '',
      email: '',
      portfolio: '',
      resume: '',
      message: '',
    },
  });

  async function onApply() {
    await new Promise((r) => setTimeout(r, 700));
    setSubmitted(true);
  }

  return (
    <Dialog onOpenChange={(open) => !open && setSubmitted(false)}>
      <DialogTrigger asChild>
        <Button className="w-full">Apply</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply — {role.title}</DialogTitle>
          <DialogDescription>Tell us a bit about you.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="font-medium">What you’ll do</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {role.responsibilities.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">What we’re looking for</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {role.requirements.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            Location: {role.location} · Compensation: {role.compensation}
          </p>
        </div>

        {submitted ? (
          <div>
            <p className="font-medium">Thanks—application received.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              We’ll get back to you soon.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form className="grid gap-3" onSubmit={form.handleSubmit(onApply)}>
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
                name="portfolio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio or LinkedIn (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume (URL, optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Link to Google Drive, Dropbox, etc."
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
                        placeholder="What makes you excited to work here?"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button className="w-full" type="submit">
                  Submit application
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

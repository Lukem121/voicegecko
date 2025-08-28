'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
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
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { z } from 'zod/v4';
import SectionHeader from '~/app/_landing/section-header';
import SectionWrapper from '~/app/_landing/section-wrapper';
import { authClient } from '~/lib/auth/client';
import { useTRPC } from '~/trpc/react';
import { APP_ROUTES } from '~/utils/app-routes';

const ContactSchema = z.object({
  name: z.string().min(1, 'Please enter your name').max(200),
  email: z.email('Please enter a valid email').max(320),
  message: z
    .string()
    .min(1, 'Please enter a message')
    .max(2000, 'Message is too long (max 2000 characters).'),
});

type ContactValues = z.infer<typeof ContactSchema>;

export default function ContactPage() {
  const session = authClient.useSession();

  return (
    <div className="bg-background">
      <SectionWrapper className="py-2 md:py-10" useXPadding={false}>
        <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-4 md:p-12 lg:p-16 dark:bg-zinc-900">
          <div
            className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
            }}
          />

          <div className="relative">
            <SectionHeader
              className="mb-8 md:mb-12"
              description="We typically respond within one business day."
              descriptionWidth="normal"
              eyebrow="Support"
              heading="Contact Voice Gecko"
              headingSize="xl"
            />

            <ContactForm
              defaultEmail={session?.data?.user?.email ?? ''}
              defaultName={session?.data?.user?.name ?? ''}
            />
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}

function ContactForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string;
  defaultName: string;
}) {
  'use client';
  const trpc = useTRPC();
  const router = useRouter();
  const submit = useMutation(trpc.contact.submit.mutationOptions());
  const form = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      message: '',
    },
  });

  return (
    <div className="mx-auto mt-10 max-w-2xl md:mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Send us a message</CardTitle>
          <CardDescription>
            Fill out the form and we’ll get back to you shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit(async (values) => {
                const posthogDistinctId = posthog.get_distinct_id();
                await submit.mutateAsync({
                  ...values,
                  url: window.location.href,
                  posthogDistinctId,
                });
                router.push(`${APP_ROUTES.MARKETING.CONTACT}/success`);
              })}
            >
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Name</FormLabel>
                      <FormControl>
                        <Input id="name" placeholder="Jane Doe" {...field} />
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
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="you@example.com"
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
                      <FormLabel htmlFor="message">Message</FormLabel>
                      <FormControl>
                        <Textarea
                          id="message"
                          placeholder="How can we help?"
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  By submitting, you agree to our terms.
                </p>
                <Button disabled={submit.isPending} type="submit">
                  {submit.isPending ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="mt-6 text-center text-muted-foreground text-sm">
        Prefer email?{' '}
        <a
          className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
          href="mailto:hello@ipflare.io"
        >
          hello@ipflare.io
        </a>
      </div>
    </div>
  );
}

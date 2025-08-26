'use client';

import { ResetPasswordSchema } from '@acme/auth/schemas/auth';
import { getAuthErrorMessage } from '@acme/auth/utils/auth-error-messages';
import VoiceGeckoLogo from '@acme/ui/components/logos/logo-full';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { z } from 'zod/v4';

import { authClient } from '~/lib/auth/client';
import { APP_ROUTES } from '~/utils/app-routes';
import TermsAndPrivacyNotice from '../../components/terms-and-privacy-notice';

type FormValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    if (!token) {
      setError(getAuthErrorMessage('INVALID_TOKEN', 'en'));
      return;
    }

    const { error: resetPasswordError } = await authClient.resetPassword({
      newPassword: values.password,
      token,
      fetchOptions: {
        onSuccess: () => {
          router.push(APP_ROUTES.AUTH.SIGN_IN);
          setIsSuccess(true);
        },
      },
    });

    if (resetPasswordError) {
      const { code, message } = resetPasswordError;
      if (code) {
        const errorMessage = getAuthErrorMessage(code, 'en', message);
        setError(errorMessage);
      }
    }

    setIsLoading(false);
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <VoiceGeckoLogo aria-label="Voice Gecko Logo" className="h-10" />
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription className="">
              Enter your new password and confirm your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="new-password"
                            inputMode="text"
                            type="password"
                            {...field}
                            disabled={isLoading || isSuccess}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passwordConfirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="new-password"
                            inputMode="text"
                            type="password"
                            {...field}
                            disabled={isLoading || isSuccess}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error !== null && (
                    <div
                      className="rounded-md bg-destructive/10 p-3 text-red-500 text-sm"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={isLoading || isSuccess}
                    type="submit"
                  >
                    {isLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <TermsAndPrivacyNotice />
      </div>
    </main>
  );
}

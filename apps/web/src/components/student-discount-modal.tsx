'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@acme/ui/components/ui/form';
import { Input } from '@acme/ui/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { useStudentDiscount } from '~/hooks/use-student-discount';
import { isEducationalEmail } from '~/utils/educational-domains';

const StudentDiscountSchema = z.object({
  email: z
    .email('Please enter a valid email address')
    .refine(isEducationalEmail, {
      message: 'Please use your educational email address (.edu, .ac.uk, etc.)',
    }),
});

type StudentDiscountFormData = z.infer<typeof StudentDiscountSchema>;

type StudentDiscountModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function StudentDiscountModal({
  isOpen,
  onClose,
}: StudentDiscountModalProps) {
  const { requestDiscount, isRequesting, result, reset } = useStudentDiscount();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const form = useForm<StudentDiscountFormData>({
    resolver: zodResolver(StudentDiscountSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (values: StudentDiscountFormData) => {
    setFormError(null);
    requestDiscount({
      email: values.email,
    });
  };

  // Handle the API response
  useEffect(() => {
    if (result) {
      if (result.success) {
        setIsSuccessful(true);
      } else {
        setFormError(
          result.error?.message ?? 'Failed to send student discount.'
        );
      }
    }
  }, [result]);

  const handleClose = () => {
    if (!isRequesting) {
      onClose();
      setTimeout(() => {
        form.reset();
        setFormError(null);
        setIsSuccessful(false);
        reset();
      }, 200);
    }
  };

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Student Discount</DialogTitle>
          <DialogDescription>
            Enter your educational email address to receive a 50% discount code
            for VoiceGecko Pro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Educational Email Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isRequesting || isSuccessful}
                      placeholder="student@university.edu"
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                  {isSuccessful && (
                    <div className="rounded-md bg-green-50 p-3 text-green-600 text-sm">
                      Discount code is on its way to your inbox. Be sure to
                      check your spam folder if you don't see it.
                    </div>
                  )}
                </FormItem>
              )}
            />

            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              {isSuccessful ? (
                <Button onClick={handleClose} type="button">
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    disabled={isRequesting}
                    onClick={handleClose}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button disabled={isRequesting} type="submit">
                    {isRequesting ? 'Sending...' : 'Request Coupon'}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import { GraduationCap } from 'lucide-react';

import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';

type StudentDiscountSectionProps = {
  variant?: 'card' | 'banner' | 'minimal';
  className?: string;
};

/**
 * Reusable student discount section that can be styled differently across pages.
 * Uses the useStudentDiscountModal hook for logic while allowing custom UI.
 */
export function StudentDiscountSection({
  variant = 'card',
  className = '',
}: StudentDiscountSectionProps) {
  const { isOpen, openModal, closeModal } = useStudentDiscountModal();

  if (variant === 'banner') {
    return (
      <>
        <div
          className={`rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 ${className}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 text-lg">
                  Student Discount Available
                </h3>
                <p className="text-blue-700 text-sm">
                  Get 50% off VoiceGecko Pro with your .edu email
                </p>
              </div>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={openModal}
            >
              Claim Discount
            </Button>
          </div>
        </div>
        <StudentDiscountModal isOpen={isOpen} onClose={closeModal} />
      </>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        <div className={`flex items-center gap-3 ${className}`}>
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Student? Get 50% off with your .edu email
          </span>
          <Button
            className="h-auto p-0 text-sm"
            onClick={openModal}
            variant="link"
          >
            Apply here
          </Button>
        </div>
        <StudentDiscountModal isOpen={isOpen} onClose={closeModal} />
      </>
    );
  }

  // Default card variant (similar to plans page but can be customized)
  return (
    <>
      <Card className={`border-0 p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Student Discount</p>
              <p className="text-muted-foreground text-sm">
                Students get 50% off the Pro plan
              </p>
            </div>
          </div>
          <Button onClick={openModal} variant="outline">
            Get started
          </Button>
        </div>
      </Card>
      <StudentDiscountModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}

'use client';

import { cn } from '@acme/ui/lib/utils';
import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
};

export default function Section({ children, id, className }: SectionProps) {
  return (
    <section
      className={cn(
        'relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-28',
        className
      )}
      id={id}
    >
      {children}
    </section>
  );
}

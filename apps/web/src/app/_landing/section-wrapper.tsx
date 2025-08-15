import { cn } from '@acme/ui/lib/utils';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
}

export default function SectionWrapper({
  children,
  className,
  id,
}: SectionWrapperProps) {
  return (
    <section
      className={cn(
        'relative mx-auto max-w-6xl px-4 py-20 md:px-6 lg:px-12',
        className
      )}
      id={id}
    >
      {children}
    </section>
  );
}
